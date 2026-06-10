/**
 * src/plugins/rateLimit.ts —— 频率限制插件注册
 *
 * 防止 API 被滥用，按 IP 限制请求频率。
 */
import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

export default fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
})
