/**
 * src/index.ts —— 服务入口
 *
 * 创建 Fastify 实例，注册所有插件与路由，启动 HTTP 服务。
 *
 * 启动命令：pnpm dev（开发模式热重载）
 */
import Fastify from 'fastify'
import corsPlugin from './plugins/cors.ts'
import jwtPlugin from './plugins/jwt.ts'
import rateLimitPlugin from './plugins/rateLimit.ts'
import multipartPlugin from '@fastify/multipart'
import routes from './routes/index.ts'
import { config } from './config.ts'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

// 注册插件
await app.register(corsPlugin)
await app.register(jwtPlugin)
await app.register(rateLimitPlugin)
await app.register(multipartPlugin, { limits: { fileSize: config.upload.maxSize } })

// 注册路由
await app.register(routes)

// 健康检查
app.get('/api/health', async () => ({ status: 'ok', timestamp: Date.now() }))

// 启动服务
try {
  await app.listen({ port: config.port, host: config.host })
  app.log.info(`Server ready → http://${config.host}:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

export default app
