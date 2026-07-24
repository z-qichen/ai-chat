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
import { authGuard } from '../middlewares/auth'
import { chatStream, chat } from '../services/deepseek'
import { createMessage, updateMessage, listAllMessages } from '../services/message'
import { getConversationByUser, createConversation, updateConversation } from '../services/conversation'
import { buildMessages } from '../services/chat'
import { getMemoryTool, handleExtractToolCalls } from '../services/memory'
import { logger } from '../logger'
import type { StreamRequestWithFiles, StreamChunk } from '../types/index'

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
        logger.info('停止流式生成', { conversationId: id })
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
      setImmediate(() => {
        if (!controller.signal.aborted) {
          request.raw.on('close', () => controller.abort())
        }
      })

      const acc = { fullContent: '', fullReasoningContent: '' }
      let memoriesAdded = 0

      logger.separator()
      logger.request('POST /chat/stream', {
        conversationId: id,
        userId,
        model,
        thinking: isThinking,
      })

      try {
        const messages = await buildMessages({ conversationId: id, userId })

        const deepseekStream = chatStream({
          messages,
          model,
          signal: controller.signal,
          thinking,
        })

        for await (const chunk of deepseekStream) {
          if (chunk.content) {
            if (chunk.type === 'thinking') {
              acc.fullReasoningContent += chunk.content
            } else {
              acc.fullContent += chunk.content
            }
          }
          logger.chunk(chunk.content || '(空)', chunk.type)
          // deepseek 的 done chunk 暂不透传，待保存消息后统一发送带 messageId 的 done
          if (chunk.done) continue
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        const savedAssistant = createMessage({
          conversationId: id,
          role: 'assistant',
          content: acc.fullContent,
          timestamp: Date.now(),
          reasoningContent: acc.fullReasoningContent || null,
        })

        // 发送带真实 messageId 的 done，供前端回填本地 assistant 消息 ID
        stream.push(`data: ${JSON.stringify({ content: '', done: true, type: 'answer', messageId: savedAssistant.id } as StreamChunk)}\n\n`)

        updateConversation(id, {})

        memoriesAdded = await processMemoriesInBackground({
          conversationId: id,
          userId,
          baseSystemPrompt: '你是一个有用的AI助手。',
        })

        logger.end('POST /chat/stream 完成', {
          answerLength: acc.fullContent.length,
          reasoningLength: acc.fullReasoningContent.length,
          memoriesAdded,
        })
      } catch (error: any) {
        logger.error('POST /chat/stream 出错', error)
        if (controller.signal.aborted && acc.fullContent) {
          logger.info('中断但有部分内容，保存 partial', { partialLength: acc.fullContent.length })
          const savedPartial = createMessage({
            conversationId: id,
            role: 'assistant',
            content: acc.fullContent,
            timestamp: Date.now(),
            partial: true,
            reasoningContent: acc.fullReasoningContent || null,
          })
          stream.push(`data: ${JSON.stringify({ content: '', done: true, aborted: true, messageId: savedPartial.id } as StreamChunk)}\n\n`)
        } else if (!controller.signal.aborted) {
          stream.push(`data: ${JSON.stringify({ error: error.message || '未知错误' })}\n\n`)
        }
      } finally {
        if (memoriesAdded > 0) {
          const notification: StreamChunk = {
            content: '',
            done: false,
            type: 'memories_added',
            memoriesAdded,
          }
          stream.push(`data: ${JSON.stringify(notification)}\n\n`)
        }

        if (activeStreams.get(id) === controller) {
          activeStreams.delete(id)
        }
        stream.push(null)
        logger.info('流已关闭')
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
      setImmediate(() => {
        if (!controller.signal.aborted) {
          request.raw.on('close', () => controller.abort())
        }
      })

      let newContent = ''
      let newReasoningContent = ''

      logger.separator()
      logger.request('POST /chat/continue', { conversationId: id, model: reqModel })

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
          // done chunk 暂不透传，待保存消息后统一发送带 messageId 的 done
          if (chunk.done) continue
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        const allMsgs = listAllMessages(id)
        const partialMsg = allMsgs.reverse().find(m => m.partial)
        let continuedMessageId: string
        if (partialMsg) {
          updateMessage(partialMsg.id, {
            content: partialMsg.content + newContent,
            partial: false,
          })
          continuedMessageId = partialMsg.id
        } else {
          const savedAssistant = createMessage({
            conversationId: id,
            role: 'assistant',
            content: newContent,
            timestamp: Date.now(),
            reasoningContent: newReasoningContent || null,
          })
          continuedMessageId = savedAssistant.id
        }

        stream.push(`data: ${JSON.stringify({ content: '', done: true, type: 'answer', messageId: continuedMessageId } as StreamChunk)}\n\n`)

        updateConversation(id, {})
        logger.end('POST /chat/continue 完成', {
          answerLength: newContent.length,
          reasoningLength: newReasoningContent.length,
        })
      } catch (error: any) {
        logger.error('POST /chat/continue 出错', error)
        if (controller.signal.aborted && newContent) {
          const allMsgs = listAllMessages(id)
          const partialMsg = allMsgs.reverse().find(m => m.partial)
          if (partialMsg) {
            updateMessage(partialMsg.id, {
              content: partialMsg.content + newContent,
              partial: true,
            })
            stream.push(`data: ${JSON.stringify({ content: '', done: true, aborted: true, messageId: partialMsg.id } as StreamChunk)}\n\n`)
          } else {
            stream.push(`data: ${JSON.stringify({ content: '', done: true, aborted: true } as StreamChunk)}\n\n`)
          }
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

async function processMemoriesInBackground(params: {
  conversationId: string
  userId: string
  baseSystemPrompt: string
}): Promise<number> {
  const { conversationId, userId, baseSystemPrompt } = params
  try {
    const messages = await buildMessages({ conversationId, userId, systemPrompt: baseSystemPrompt })
    const memoryTool = getMemoryTool()
    const result = await chat({ messages, model: 'deepseek-chat', tools: [memoryTool] })
    if (result.toolCalls.length > 0) {
      return handleExtractToolCalls(result.toolCalls, userId)
    }
  } catch {
    // 后台提取失败静默处理
  }
  return 0
}
