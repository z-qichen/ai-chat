/**
 * src/middlewares/auth.ts —— 认证中间件
 *
 * 从请求中验证 JWT token，将用户信息注入 request.user。
 * 用于保护需要登录的 API 路由。
 */
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: '未登录或 token 已过期' })
  }
}
