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

export default async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/login —— 用户登录
   *
   * 请求体：{ username: string, password: string }
   * 成功响应：{ token, user: { id, username }, conversations: [...] }
   * 失败响应：401 { error: "用户名或密码错误" }
   */
  app.post('/api/auth/login', async (request, reply) => {
    // Zod 校验请求体
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: '请求参数校验失败',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { username, password } = parsed.data

    // 验证用户名密码
    const user = verifyUserLogin(username, password)
    if (!user) {
      return reply.code(401).send({ error: '用户名或密码错误' })
    }

    // 签发 JWT token（7 天有效期）
    const token = app.jwt.sign({ userId: user.id, username: user.username })

    // 查询用户现有会话列表（前 20 条，按更新时间倒序）
    const { data: conversations } = listConversations(user.id, undefined, 20)

    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
      conversations,
    }

    return response
  })

  /**
   * POST /api/auth/register —— 用户注册
   *
   * 请求体：{ username: string, password: string }
   * 成功响应：201 { token, user: { id, username }, conversations: [] }
   * 失败响应：409 { error: "用户名已存在" }
   */
  app.post('/api/auth/register', async (request, reply) => {
    // Zod 校验请求体
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        error: '请求参数校验失败',
        details: parsed.error.flatten().fieldErrors,
      })
    }

    const { username, password } = parsed.data

    // 检查用户名是否已被占用
    if (findUserByUsername(username)) {
      return reply.code(409).send({ error: '用户名已存在' })
    }

    // 创建用户（内部 scrypt 哈希密码）
    const user = createUser(username, password)

    // 签发 JWT token
    const token = app.jwt.sign({ userId: user.id, username: user.username })

    const response: AuthResponse = {
      token,
      user: { id: user.id, username: user.username },
      conversations: [], // 新用户尚无会话
    }

    return reply.code(201).send(response)
  })
}
