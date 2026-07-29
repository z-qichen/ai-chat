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
import { getMainTools, getMainToolDefinitions, getToolExecutor } from '../services/tools'
import type { SearchToolOutput } from '../services/search'
import { getUserSystemPrompt } from '../services/user'
import { logger } from '../logger'
import type { StreamRequestWithFiles, StreamChunk, ChatMessage } from '../types/index'
import { idParamSchema } from '../schemas/common'
import { validate } from '../utils/validators'
import { success, fail } from '../utils/response'

const activeStreams = new Map<string, AbortController>()

export default async function chatRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.post(
    '/api/conversations/:id/chat/stop',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = validate(idParamSchema, request.params)
      const userId = (request as any).user.userId

      const conversation = getConversationByUser(id, userId)
      if (!conversation) {
        return reply.status(404).send(fail('CONVERSATION_NOT_FOUND', '对话不存在'))
      }

      const controller = activeStreams.get(id)
      if (controller) {
        logger.info('停止流式生成', { conversationId: id })
        controller.abort()
        return success(null, '已停止生成')
      }
      return success(null, '没有正在进行的流式对话')
    }
  )

  app.post(
    '/api/conversations/:id/chat/stream',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = validate(idParamSchema, request.params)
      const userId = (request as any).user.userId
      const userName = (request as any).user.username
      const { model: reqModel, fileIds, thinking, systemPrompt: reqSystemPrompt, webSearch } = request.body as StreamRequestWithFiles

      const isThinking = thinking?.type === 'enabled'
      const defaultModel = isThinking ? 'deepseek-v4-pro' : 'deepseek-v4-flash'
      const model = reqModel ?? defaultModel

      const systemPrompt = reqSystemPrompt ?? getUserSystemPrompt(userId) ?? undefined

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
      const accToolCalls: Array<{ name: string; args: string; result?: string; searchResults?: any; answer?: string; responseTime?: number }> = []
      let memoriesAdded = 0

      logger.separator()
      logger.request('POST /chat/stream', {
        conversationId: id,
        userId,
        model,
        thinking: isThinking,
      })

      try {
        const buildResult = await buildMessages({ conversationId: id, userId, systemPrompt, userName })
        const { messages, tokenCount, tokenLimit } = buildResult
        const mainTools = getMainToolDefinitions({ includeSearch: webSearch })

        stream.push(`data: ${JSON.stringify({ type: 'meta', tokenCount, tokenLimit })}\n\n`)

        const agentMessages: ChatMessage[] = [...messages]

        // ---- Phase 1: Agent Loop（非流式 tool calling） ----
        const maxRounds = 5
        for (let round = 0; round < maxRounds; round++) {
          const result = await chat({
            messages: agentMessages,
            model,
            signal: controller.signal,
            tools: mainTools,
          })

          if (result.toolCalls.length === 0) break

          agentMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: result.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          })

          for (const tc of result.toolCalls) {
            stream.push(`data: ${JSON.stringify({
              type: 'tool_call',
              content: '',
              done: false,
              toolCallName: tc.function.name,
              toolCallArgs: tc.function.arguments,
            } as StreamChunk)}\n\n`)

            let toolOutput: string
            let searchData: StreamChunk['searchData']
            try {
              const executor = getToolExecutor(tc.function.name)
              if (!executor) {
                toolOutput = `未知工具: ${tc.function.name}`
              } else {
                const rawOutput = await executor.execute(tc.function.arguments)
                if (tc.function.name === 'web_search') {
                  const parsed = JSON.parse(rawOutput) as SearchToolOutput
                  toolOutput = parsed.llmText
                  searchData = {
                    answer: parsed.answer,
                    results: parsed.results,
                    responseTime: parsed.responseTime,
                  }
                } else {
                  toolOutput = rawOutput
                }
              }
            } catch (err: any) {
              toolOutput = `工具执行错误: ${err.message || '未知错误'}`
            }

            stream.push(`data: ${JSON.stringify({
              type: 'tool_result',
              content: searchData ? '' : toolOutput,
              done: false,
              toolCallName: tc.function.name,
              searchData,
            } as StreamChunk)}\n\n`)

            accToolCalls.push({
              name: tc.function.name,
              args: tc.function.arguments,
              result: searchData ? '' : toolOutput,
              searchResults: searchData?.results,
              answer: searchData?.answer,
              responseTime: searchData?.responseTime,
            })

            agentMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: toolOutput,
            })
          }
        }

        // ---- Phase 2: 流式输出最终答案 ----
        const deepseekStream = chatStream({
          messages: agentMessages,
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
          if (chunk.done) continue
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
        }

        const savedAssistant = createMessage({
          conversationId: id,
          role: 'assistant',
          content: acc.fullContent,
          timestamp: Date.now(),
          reasoningContent: acc.fullReasoningContent || null,
          toolCalls: accToolCalls.length > 0 ? accToolCalls : null,
        })

        // 发送带真实 messageId 的 done，供前端回填本地 assistant 消息 ID
        stream.push(`data: ${JSON.stringify({ content: '', done: true, type: 'answer', messageId: savedAssistant.id } as StreamChunk)}\n\n`)

        updateConversation(id, {})

        memoriesAdded = await processMemoriesInBackground({
          conversationId: id,
          userId,
          baseSystemPrompt: systemPrompt ?? '你是一个有用的AI助手。',
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
            toolCalls: accToolCalls.length > 0 ? accToolCalls : null,
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
      const { id } = validate(idParamSchema, request.params)
      const userId = (request as any).user.userId
      const userName = (request as any).user.username
      const { model: reqModel = 'deepseek-v4-flash', thinking, systemPrompt: reqSystemPrompt } = (request.body || {}) as StreamRequestWithFiles

      const systemPrompt = reqSystemPrompt ?? getUserSystemPrompt(userId) ?? undefined

      const conversation = getConversationByUser(id, userId)
      if (!conversation) {
        return reply.status(404).send(fail('CONVERSATION_NOT_FOUND', '对话不存在'))
      }

      const buildResult = await buildMessages({ conversationId: id, userId, systemPrompt, userName })
      const { messages, tokenCount, tokenLimit } = buildResult

      const stream = new Readable({ read() {} })

      reply.header('Content-Type', 'text/event-stream')
      reply.header('Cache-Control', 'no-cache')
      reply.header('Connection', 'keep-alive')
      reply.header('X-Accel-Buffering', 'no')

      reply.send(stream)

      stream.push(':ok\n\n')

      stream.push(`data: ${JSON.stringify({ type: 'meta', tokenCount, tokenLimit })}\n\n`)

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
            reasoningContent: (partialMsg.reasoningContent || '') + newReasoningContent || null,
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
              reasoningContent: (partialMsg.reasoningContent || '') + newReasoningContent || null,
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
    const result = await buildMessages({ conversationId, userId, systemPrompt: baseSystemPrompt })
    const memoryTool = getMemoryTool()
    const chatResult = await chat({ messages: result.messages, model: 'deepseek-v4-flash', tools: [memoryTool] })
    if (chatResult.toolCalls.length > 0) {
      return handleExtractToolCalls(chatResult.toolCalls, userId)
    }
  } catch (err) {
    logger.error(`后台记忆提取失败 conversationId=${conversationId}`, err)
  }
  return 0
}
