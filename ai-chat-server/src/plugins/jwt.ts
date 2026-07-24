/**
 * src/plugins/jwt.ts —— JWT 认证插件注册
 *
 * 注册 @fastify/jwt 插件，提供 token 签发与验证能力。
 */
import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import { config } from '../config'

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiresIn },
  })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.code(401).send({ error: '未登录或 token 已过期' })
    }
  })
})
