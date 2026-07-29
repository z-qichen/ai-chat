/**
 * src/routes/memory.ts —— 用户记忆管理路由
 *
 * GET    /api/memories          — 获取当前用户所有记忆
 * POST   /api/memories          — 手动添加或更新一条记忆
 * DELETE /api/memories/:id      — 删除指定记忆
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth'
import { listMemories, upsertMemory, deleteMemory } from '../services/memory'
import type { MemoryItem } from '../types/index'
import { idParamSchema } from '../schemas/common'
import { validate } from '../utils/validators'
import { success, fail } from '../utils/response'

const VALID_CATEGORIES = ['identity', 'address', 'preference', 'background', 'other'] as const

export default async function memoryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get('/api/memories', async (request: FastifyRequest) => {
    const userId = (request as any).user.userId
    const memories = listMemories(userId)
    return success(memories)
  })

  app.post('/api/memories', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId
    const body = request.body as any

    if (!body || typeof body !== 'object') {
      return reply.status(400).send(fail('VALIDATION_ERROR', '请求体不能为空'))
    }

    const { category, key, value } = body
    if (!category || !key || !value) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'category、key、value 为必填字段'))
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return reply.status(400).send(fail('VALIDATION_ERROR', `无效的 category，支持：${VALID_CATEGORIES.join(', ')}`))
    }
    if (typeof key !== 'string' || key.trim().length === 0) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'key 不能为空'))
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'value 不能为空'))
    }

    const memory = upsertMemory(
      userId,
      category as MemoryItem['category'],
      key.trim(),
      value.trim(),
      body.confidence ?? 1.0,
      'manual'
    )
    return reply.status(201).send(success(memory, '记忆已添加'))
  })

  app.delete('/api/memories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId
    const { id } = validate(idParamSchema, request.params)

    const deleted = deleteMemory(id, userId)
    if (!deleted) {
      return reply.status(404).send(fail('MEMORY_NOT_FOUND', '记忆不存在'))
    }
    return success(null, '记忆已删除')
  })
}
