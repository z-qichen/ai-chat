/**
 * src/routes/index.ts —— 路由聚合
 *
 * 统一注册所有路由模块。
 */
import type { FastifyInstance } from 'fastify'
import authRoutes from './auth'
import conversationRoutes from './conversations'
import messageRoutes from './messages'
import chatRoutes from './chat'
import modelRoutes from './models'
import fileRoutes from './files'
import memoryRoutes from './memory'
import userRoutes from './user'
import taskRoutes from './tasks'

export default async function routes(app: FastifyInstance) {
  await app.register(authRoutes)
  await app.register(conversationRoutes)
  await app.register(messageRoutes)
  await app.register(chatRoutes)
  await app.register(modelRoutes)
  await app.register(fileRoutes)
  await app.register(memoryRoutes)
  await app.register(userRoutes)
  await app.register(taskRoutes)
}
