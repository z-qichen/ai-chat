/**
 * src/routes/messages.ts —— 消息路由
 *
 * 所有路由需要 JWT 认证。
 *
 * GET    /api/conversations/:id/messages — 获取消息列表（游标分页，按需加载历史消息）
 * POST   /api/conversations/:id/messages — 保存消息（简单插入，不触发 AI）
 */
import type { FastifyInstance } from 'fastify'
import { authGuard } from '../middlewares/auth'
import type { PaginationQuery, SaveMessageBody } from '../types/index'
import { listMessages, createMessage } from '../services/message'
import { getConversationByUser, createConversation, updateConversation } from '../services/conversation'
import { idParamSchema } from '../schemas/common'
import { validate } from '../utils/validators'
import { success } from '../utils/response'

export default async function messageRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get('/api/conversations/:id/messages', async (request, reply) => {
    const { id } = validate(idParamSchema, request.params)
    const userId = (request as any).user.userId
    const { cursor, limit = 50 } = request.query as PaginationQuery

    let conversation = getConversationByUser(id, userId)
    if (!conversation) {
      conversation = createConversation(userId, '新对话', 'deepseek-chat', id)
    }

    const result = listMessages(id, cursor, limit)
    return success({
      messages: result.data,
      hasMore: result.hasMore,
      total: result.total,
    })
  })

  app.post('/api/conversations/:id/messages', async (request, reply) => {
    const { id } = validate(idParamSchema, request.params)
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
    return success(message, '消息已保存')
  })
}
