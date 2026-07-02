/**
 * src/routes/messages.ts —— 消息路由
 *
 * 所有路由需要 JWT 认证。
 *
 * GET    /api/conversations/:id/messages — 获取消息列表（游标分页，按需加载历史消息）
 * POST   /api/conversations/:id/messages — 保存消息（简单插入，不触发 AI）
 */
import type { FastifyInstance } from 'fastify'
import { authGuard } from '../middlewares/auth.ts'
import type { PaginationQuery, Message } from '../types/index.ts'
import { listMessages, createMessage } from '../services/message.ts'
import { getConversationByUser, createConversation, updateConversation } from '../services/conversation.ts'

type SaveMessageBody = {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: string
}

export default async function messageRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get('/api/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId
    const { cursor, limit = 50 } = request.query as PaginationQuery

    let conversation = getConversationByUser(id, userId)
    if (!conversation) {
      // 前端可能持有本地生成的会话 ID（未通过后端创建），
      // 自动在后端创建对应记录，避免 "会话不存在" 错误
      conversation = createConversation(userId, '新对话', 'deepseek-chat', id)
    }

    const result = listMessages(id, cursor, limit)
    return {
      messages: result.data,
      hasMore: result.hasMore,
      total: result.total,
    }
  })

  app.post('/api/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId
    const { role, content, files } = request.body as SaveMessageBody

    let conversation = getConversationByUser(id, userId)
    if (!conversation) {
      conversation = createConversation(userId, '新对话', 'deepseek-chat', id)
    }

    const message = createMessage({
      conversationId: id,
      role,
      content,
      timestamp: Date.now(),
      files,
    })

    updateConversation(id, {})

    reply.code(201)
    return message
  })
}
