/**
 * src/routes/memory.ts —— 用户记忆管理路由
 *
 * GET    /api/memories          — 获取当前用户所有记忆
 * POST   /api/memories          — 手动添加或更新一条记忆
 * DELETE /api/memories/:id      — 删除指定记忆
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth.ts'
import { listMemories, upsertMemory, deleteMemory } from '../services/memory.ts'
import type { MemoryItem } from '../types/index.ts'

const VALID_CATEGORIES = ['identity', 'address', 'preference', 'background', 'other'] as const

export default async function memoryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get('/api/memories', async (request: FastifyRequest) => {
    const userId = (request as any).user.userId
    const memories = listMemories(userId)
    return { data: memories }
  })

  app.post('/api/memories', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId
    const body = request.body as any

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: '请求体不能为空' })
    }

    const { category, key, value } = body
    if (!category || !key || !value) {
      return reply.status(400).send({ error: 'category、key、value 为必填字段' })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return reply.status(400).send({
        error: `无效的 category，支持：${VALID_CATEGORIES.join(', ')}`,
      })
    }
    if (typeof key !== 'string' || key.trim().length === 0) {
      return reply.status(400).send({ error: 'key 不能为空' })
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return reply.status(400).send({ error: 'value 不能为空' })
    }

    const memory = upsertMemory(
      userId,
      category as MemoryItem['category'],
      key.trim(),
      value.trim(),
      body.confidence ?? 1.0,
      'manual'
    )
    return reply.status(201).send({ data: memory })
  })

  app.delete('/api/memories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId
    const { id } = request.params as { id: string }

    const deleted = deleteMemory(id, userId)
    if (!deleted) {
      return reply.status(404).send({ error: '记忆不存在' })
    }
    return { success: true }
  })
}
