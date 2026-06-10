/**
 * src/routes/index.ts —— 路由聚合
 *
 * 统一注册所有路由模块。
 */
import type { FastifyInstance } from 'fastify'
import authRoutes from './auth.ts'
import conversationRoutes from './conversations.ts'
import messageRoutes from './messages.ts'
import chatRoutes from './chat.ts'
import modelRoutes from './models.ts'
import fileRoutes from './files.ts'

export default async function routes(app: FastifyInstance) {
  await app.register(authRoutes)
  await app.register(conversationRoutes)
  await app.register(messageRoutes)
  await app.register(chatRoutes)
  await app.register(modelRoutes)
  await app.register(fileRoutes)
}
