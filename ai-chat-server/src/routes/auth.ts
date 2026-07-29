/**
 * src/routes/auth.ts —— 认证相关路由
 *
 * POST /api/auth/register — 用户注册
 *   1. Zod 校验 username / password
 *   2. 检查用户名是否已存在
 *   3. scrypt 哈希密码 → 写入 users 表
 *   4. 签发 JWT token
 *   5. 返回 token + user + conversations（新用户为空数组）
 *
 * POST /api/auth/login    — 用户登录
 *   1. Zod 校验 username / password
 *   2. 查找用户并验证密码
 *   3. 签发 JWT token
 *   4. 查询用户现有会话列表（游标分页，前 20 条）
 *   5. 返回 token + user + conversations
 */
import type { FastifyInstance } from 'fastify'
import { createUser, verifyLogin as verifyUserLogin, findUserByUsername } from '../services/user'
import { listConversations } from '../services/conversation'
import { registerSchema, loginSchema } from '../schemas/auth'
import type { AuthResponse } from '../types/index'
import { success, fail } from '../utils/response'
import { AppError } from '../utils/appError'

export default async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login —— 用户登录
   *
   * 请求体：{ username: string, password: string }
   * 成功响应：{ code: 0, data: { token, user, conversations } }
   * 失败响应：401
   */
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', '请求参数校验失败'))
    }

    const { username, password } = parsed.data

    const user = verifyUserLogin(username, password)
    if (!user) {
      return reply.code(401).send(fail('AUTH_FAILED', '用户名或密码错误'))
    }

    const token = app.jwt.sign({ userId: user.id, username: user.username })
    const { data: conversations } = listConversations(user.id, undefined, 20)

    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
      conversations,
    }

    return success(response)
  })

  /**
   * POST /api/auth/register —— 用户注册
   *
   * 请求体：{ username: string, password: string }
   * 成功响应：201
   * 失败响应：409
   */
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send(fail('VALIDATION_ERROR', '请求参数校验失败'))
    }

    const { username, password } = parsed.data

    if (findUserByUsername(username)) {
      return reply.code(409).send(fail('USER_EXISTS', '用户名已存在'))
    }

    const user = createUser(username, password)
    const token = app.jwt.sign({ userId: user.id, username: user.username })

    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
      conversations: [],
    }

    return reply.code(201).send(success(response, '注册成功'))
  })
}
