/**
 * src/routes/chat.ts —— SSE 流式对话路由
 *
 * POST /api/conversations/:id/chat/stream — SSE 流式回复（含记忆自动提取）
 * POST /api/conversations/:id/chat/stop   — 停止生成
 * POST /api/conversations/:id/chat/continue — 继续被截断的消息
 *
 * 用户消息已由 addMessage API 提前保存，
 * 本路由负责调用 DeepSeek API 并将生成结果以 SSE 格式推送给前端。
 * 同时通过 Tool Calling 自动提取用户个人信息并持久化到 user_memories 表。
 */
import { Readable } from 'node:stream'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth.ts'
import { chatStream } from '../services/deepseek.ts'
import { createMessage, updateMessage, listAllMessages } from '../services/message.ts'
import { getConversationByUser, createConversation, updateConversation } from '../services/conversation.ts'
import { buildMessages } from '../services/chat.ts'
import { getMemoryTool, handleExtractToolCalls, injectMemoriesIntoSystemPrompt } from '../services/memory.ts'
import type { StreamRequestWithFiles, StreamChunk } from '../types/index.ts'

/** 记忆提取最大轮次，防止无限循环 */
const MAX_MEMORY_ROUNDS = 2

const activeStreams = new Map<string, AbortController>()

export default async function chatRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.post(
    '/api/conversations/:id/chat/stop',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = (request as any).user.userId

      const conversation = getConversationByUser(id, userId)
      if (!conversation) {
        return reply.status(404).send({ error: '对话不存在' })
      }

      const controller = activeStreams.get(id)
      if (controller) {
        controller.abort()
        return { success: true }
      }
      return { success: false, message: '没有正在进行的流式对话' }
    }
  )

  app.post(
    '/api/conversations/:id/chat/stream',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = (request as any).user.userId
      const { model: reqModel, fileIds, thinking } = request.body as StreamRequestWithFiles

      const isThinking = thinking?.type === 'enabled'
      const defaultModel = isThinking ? 'deepseek-v4-pro' : 'deepseek-chat'
      const model = reqModel ?? defaultModel

      let conversation = getConversationByUser(id, userId)
      if (!conversation) {
        conversation = createConversation(userId, '新对话', model, id)
      }

      const stream = new Readable({ read() {} })

      reply.header('Content-Type', 'text/event-stream')
      reply.header('Cache-Control', 'no-cache')
      reply.header('Connection', 'keep-alive')
      reply.header('X-Accel-Buffering', 'no')

      reply.send(stream)

      stream.push(':ok\n\n')

      const controller = new AbortController()
      activeStreams.set(id, controller)
      request.raw.on('close', () => controller.abort())

      let fullContent = ''
      let fullReasoningContent = ''

      try {
        const memoryTool = getMemoryTool()

        const result = await streamWithMemoryExtraction({
          conversationId: id,
          userId,
          model,
          signal: controller.signal,
          thinking,
          memoryTool,
          maxRounds: MAX_MEMORY_ROUNDS,
        })

        for (const chunk of result.chunks) {
          if (chunk.content) {
            if (chunk.type === 'thinking') {
              fullReasoningContent += chunk.content
            } else if (chunk.type === 'answer') {
              fullContent += chunk.content
            }
          }
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        if (result.memoriesAdded > 0) {
          const notification: StreamChunk = {
            content: '',
            done: false,
            type: 'memories_added',
            memoriesAdded: result.memoriesAdded,
          }
          stream.push(`data: ${JSON.stringify(notification)}\n\n`)
        }

        createMessage({
          conversationId: id,
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
          reasoningContent: fullReasoningContent || null,
        })

        updateConversation(id, {})
      } catch (error: any) {
        if (controller.signal.aborted && fullContent) {
          createMessage({
            conversationId: id,
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
            partial: true,
            reasoningContent: fullReasoningContent || null,
          })
          stream.push(`data: ${JSON.stringify({ content: '', done: true, aborted: true })}\n\n`)
        } else if (!controller.signal.aborted) {
          stream.push(`data: ${JSON.stringify({ error: error.message || '未知错误' })}\n\n`)
        }
      } finally {
        if (activeStreams.get(id) === controller) {
          activeStreams.delete(id)
        }
        stream.push(null)
      }
    }
  )

  app.post(
    '/api/conversations/:id/chat/continue',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const userId = (request as any).user.userId
      const { model: reqModel = 'deepseek-chat', thinking } = (request.body || {}) as StreamRequestWithFiles

      const conversation = getConversationByUser(id, userId)
      if (!conversation) {
        return reply.status(404).send({ error: '对话不存在' })
      }

      const messages = await buildMessages({ conversationId: id, userId })

      const stream = new Readable({ read() {} })

      reply.header('Content-Type', 'text/event-stream')
      reply.header('Cache-Control', 'no-cache')
      reply.header('Connection', 'keep-alive')
      reply.header('X-Accel-Buffering', 'no')

      reply.send(stream)

      stream.push(':ok\n\n')

      const controller = new AbortController()
      activeStreams.set(id, controller)
      request.raw.on('close', () => controller.abort())

      let newContent = ''
      let newReasoningContent = ''

      try {
        const deepseekStream = chatStream({ messages, model: reqModel, signal: controller.signal, thinking })

        for await (const chunk of deepseekStream) {
          if (chunk.content) {
            if (chunk.type === 'thinking') {
              newReasoningContent += chunk.content
            } else {
              newContent += chunk.content
            }
          }
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        const allMsgs = listAllMessages(id)
        const partialMsg = allMsgs.reverse().find(m => m.partial)
        if (partialMsg) {
          updateMessage(partialMsg.id, {
            content: partialMsg.content + newContent,
            partial: false,
          })
        } else {
          createMessage({
            conversationId: id,
            role: 'assistant',
            content: newContent,
            timestamp: Date.now(),
            reasoningContent: newReasoningContent || null,
          })
        }

        updateConversation(id, {})
      } catch (error: any) {
        if (controller.signal.aborted && newContent) {
          const allMsgs = listAllMessages(id)
          const partialMsg = allMsgs.reverse().find(m => m.partial)
          if (partialMsg) {
            updateMessage(partialMsg.id, {
              content: partialMsg.content + newContent,
              partial: true,
            })
          }
          stream.push(`data: ${JSON.stringify({ content: '', done: true, aborted: true })}\n\n`)
        } else if (!controller.signal.aborted) {
          stream.push(`data: ${JSON.stringify({ error: error.message || '未知错误' })}\n\n`)
        }
      } finally {
        if (activeStreams.get(id) === controller) {
          activeStreams.delete(id)
        }
        stream.push(null)
      }
    }
  )
}

/**
 * 带记忆提取的流式对话
 *
 * 最多进行 maxRounds 轮 tool calling：
 * - 每轮先流式调用 LLM（带 extract_user_info 工具）
 * - 如果 LLM 返回 tool_calls，则写入记忆、更新消息列表、进入下一轮
 * - 最后一轮或无需工具调用时，返回最终 chunks
 */
async function streamWithMemoryExtraction(params: {
  conversationId: string
  userId: string
  model: string
  signal: AbortSignal
  thinking?: { type: 'enabled' | 'disabled' }
  memoryTool: ReturnType<typeof getMemoryTool>
  maxRounds: number
}): Promise<{ chunks: StreamChunk[]; memoriesAdded: number }> {
  const { conversationId, userId, model, signal, thinking, memoryTool, maxRounds } = params
  const baseSystemPrompt = '你是一个有用的AI助手。'
  let messages = await buildMessages({ conversationId, userId, systemPrompt: baseSystemPrompt })
  let totalMemoriesAdded = 0

  for (let round = 0; round < maxRounds; round++) {
    const isLastRound = round === maxRounds - 1
    const tools = isLastRound ? [] : [memoryTool]

    const deepseekStream = chatStream({ messages, model, signal, thinking, tools })
    const chunks: StreamChunk[] = []
    let toolCalls: StreamChunk['toolCalls'] | undefined

    for await (const chunk of deepseekStream) {
      if (chunk.toolCalls?.length) {
        toolCalls = chunk.toolCalls
      } else {
        chunks.push(chunk)
      }
    }

    if (!toolCalls) {
      return { chunks, memoriesAdded: totalMemoriesAdded }
    }

    // 处理 tool_calls，写入记忆
    const count = handleExtractToolCalls(toolCalls, userId)
    totalMemoriesAdded += count

    if (count === 0) {
      return { chunks, memoriesAdded: totalMemoriesAdded }
    }

    // 将 tool_calls 和结果追加到消息列表
    messages.push({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: tc.function,
      })),
    })

    for (const tc of toolCalls) {
      messages.push({
        role: 'tool',
        content: '已记录',
        tool_call_id: tc.id,
      })
    }

    // 刷新 system prompt 中的记忆
    messages[0].content = injectMemoriesIntoSystemPrompt(userId, baseSystemPrompt)
  }

  // 最后一轮：不带 tools 的纯流式回复
  const finalStream = chatStream({ messages, model, signal, thinking, tools: [] })
  const chunks: StreamChunk[] = []
  for await (const chunk of finalStream) {
    chunks.push(chunk)
  }

  return { chunks, memoriesAdded: totalMemoriesAdded }
}
