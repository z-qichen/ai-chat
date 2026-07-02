/**
 * src/routes/conversations.ts —— 会话 CRUD 路由
 *
 * 所有路由需要 JWT 认证。
 *
 * GET    /api/conversations          — 获取当前用户会话列表（游标分页）
 * POST   /api/conversations          — 创建新会话
 * GET    /api/conversations/:id      — 获取单个会话详情
 * PATCH  /api/conversations/:id      — 更新会话（标题/模型）
 * DELETE /api/conversations/:id      — 删除会话及其所有消息
 */
import type { FastifyInstance } from 'fastify'
import { authGuard } from '../middlewares/auth.ts'
import type {
  CreateConversationBody,
  UpdateConversationBody,
  PaginationQuery,
} from '../types/index.ts'
import {
  listConversations,
  createConversation,
  getConversationByUser,
  updateConversation,
  deleteConversation,
} from '../services/conversation.ts'
import {
  createConversationSchema,
  updateConversationSchema,
  paginationSchema,
} from '../schemas/conversation.ts'

export default async function conversationRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get('/api/conversations', async (request, reply) => {
    const userId = (request as any).user.userId

    const parsed = paginationSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({
        error: '请求参数校验失败',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { cursor, limit } = parsed.data
    const result = listConversations(userId, cursor, limit)
    return result
  })

  app.post('/api/conversations', async (request, reply) => {
    const userId = (request as any).user.userId

    const parsed = createConversationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: '请求参数校验失败',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { title, model } = parsed.data as CreateConversationBody
    const conversation = createConversation(
      userId,
      title?.slice(0, 30) || '新对话',
      model || 'deepseek-chat'
    )
    reply.code(201)
    return { data: conversation }
  })

  app.get('/api/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId

    let conversation = getConversationByUser(id, userId)
    if (!conversation) {
      // 前端可能持有本地生成的会话 ID（未通过后端创建），自动创建
      conversation = createConversation(userId, '新对话', 'deepseek-chat', id)
    }

    return { data: conversation }
  })

  app.patch('/api/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId

    const parsed = updateConversationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: '请求参数校验失败',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { title, model } = parsed.data as UpdateConversationBody

    const conversation = getConversationByUser(id, userId)
    if (!conversation) {
      reply.code(404)
      return { error: '会话不存在' }
    }

    const updated = updateConversation(id, {
      title: title?.slice(0, 30),
      model,
    })
    return { data: updated }
  })

  app.delete('/api/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request as any).user.userId

    const conversation = getConversationByUser(id, userId)
    if (!conversation) {
      reply.code(404)
      return { error: '会话不存在' }
    }

    const deleted = deleteConversation(id)
    if (!deleted) {
      reply.code(404)
      return { error: '会话不存在' }
    }

    return { success: true }
  })
}
