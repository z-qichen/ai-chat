/**
 * src/routes/chat.ts —— SSE 流式对话路由
 *
 * POST /api/conversations/:id/chat/stream — SSE 流式回复
 *
 * 用户消息已由 addMessage API 提前保存，
 * 本路由负责调用 DeepSeek API 流式接口并将生成结果以 SSE 格式推送给前端。
 */
import { Readable } from 'node:stream'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth.ts'
import { chatStream } from '../services/deepseek.ts'
import { createMessage, updateMessage, listAllMessages } from '../services/message.ts'
import { getConversationByUser, createConversation, updateConversation } from '../services/conversation.ts'
import { buildMessages } from '../services/chat.ts'
import type { StreamRequestWithFiles } from '../types/index.ts'

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

      // 思考模式下默认使用 deepseek-v4-pro
      const isThinking = thinking?.type === 'enabled'
      const defaultModel = isThinking ? 'deepseek-v4-pro' : 'deepseek-chat'
      const model = reqModel ?? defaultModel

      let conversation = getConversationByUser(id, userId)
      if (!conversation) {
        conversation = createConversation(userId, '新对话', model, id)
      }

      const messages = await buildMessages({ conversationId: id })

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
        const deepseekStream = chatStream({ messages, model, signal: controller.signal, thinking })

        for await (const chunk of deepseekStream) {
          if (chunk.content) {
            if (chunk.type === 'thinking') {
              fullReasoningContent += chunk.content
            } else {
              fullContent += chunk.content
            }
          }
          stream.push(`data: ${JSON.stringify(chunk)}\n\n`)
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

      const messages = await buildMessages({ conversationId: id })

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
