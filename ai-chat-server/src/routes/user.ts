/**
 * src/routes/user.ts —— 用户设置相关路由
 *
 * GET  /api/user/settings — 获取当前用户的系统提示词
 * PUT  /api/user/settings — 更新当前用户的系统提示词
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth'
import { getUserSystemPrompt, updateUserSystemPrompt } from '../services/user'
import { success, fail } from '../utils/response'

export default async function userRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  app.get(
    '/api/user/settings',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const { userId } = (request as any).user
      const systemPrompt = getUserSystemPrompt(userId)
      return success({ systemPrompt })
    }
  )

  app.put(
    '/api/user/settings',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = (request as any).user
      const { systemPrompt } = request.body as { systemPrompt?: string }

      if (typeof systemPrompt !== 'string') {
        return reply.status(400).send(fail('VALIDATION_ERROR', '参数 systemPrompt 必须是字符串'))
      }

      updateUserSystemPrompt(userId, systemPrompt)
      return success(null, '设置已更新')
    }
  )
}
