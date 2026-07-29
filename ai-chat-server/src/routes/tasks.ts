/**
 * src/routes/tasks.ts —— 定时任务 CRUD 路由
 *
 * 所有路由需要 JWT 认证。
 *
 * GET    /api/tasks          — 获取当前用户所有定时任务
 * POST   /api/tasks          — 创建定时任务
 * PUT    /api/tasks/:id      — 更新定时任务
 * DELETE /api/tasks/:id      — 删除定时任务
 * POST   /api/tasks/:id/toggle — 切换启用状态
 * POST   /api/tasks/:id/run    — 立即执行一次
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authGuard } from '../middlewares/auth'
import type { CreateTaskBody, UpdateTaskBody } from '../types/index'
import {
  listTasks,
  createTask,
  getTaskByUser,
  updateTask,
  deleteTask,
  toggleTask,
} from '../services/task'
import { executeTask } from '../scheduler/executor'
import { idParamSchema } from '../schemas/common'
import { validate } from '../utils/validators'
import { success, fail } from '../utils/response'

const VALID_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly'] as const

export default async function taskRoutes(app: FastifyInstance) {
  app.addHook('onRequest', authGuard)

  /** 获取定时任务列表 */
  app.get('/api/tasks', async (request: FastifyRequest) => {
    const userId = (request as any).user.userId
    const tasks = listTasks(userId)
    return success(tasks)
  })

  /** 创建定时任务 */
  app.post('/api/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId
    const body = request.body as any

    if (!body.title || !body.prompt || !body.frequencyType || !body.time) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'title、prompt、frequencyType、time 为必填字段'))
    }
    if (!VALID_FREQUENCIES.includes(body.frequencyType)) {
      return reply.status(400).send(fail('VALIDATION_ERROR', `frequencyType 必须为 ${VALID_FREQUENCIES.join('/')}`))
    }
    if (typeof body.time !== 'string' || !/^\d{2}:\d{2}$/.test(body.time)) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'time 格式必须为 HH:mm'))
    }

    const task = createTask(userId, {
      title: body.title,
      prompt: body.prompt,
      frequencyType: body.frequencyType,
      time: body.time,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      expiresAt: body.expiresAt,
      deepThink: body.deepThink,
      webSearch: body.webSearch,
    })

    return reply.status(201).send(success(task, '创建成功'))
  })

  /** 更新定时任务 */
  app.put('/api/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, request.params)
    const userId = (request as any).user.userId
    const body = request.body as UpdateTaskBody

    const existing = getTaskByUser(id, userId)
    if (!existing) {
      return reply.status(404).send(fail('TASK_NOT_FOUND', '任务不存在'))
    }

    if (body.frequencyType && !VALID_FREQUENCIES.includes(body.frequencyType)) {
      return reply.status(400).send(fail('VALIDATION_ERROR', `frequencyType 必须为 ${VALID_FREQUENCIES.join('/')}`))
    }
    if (body.time && !/^\d{2}:\d{2}$/.test(body.time)) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'time 格式必须为 HH:mm'))
    }

    const updated = updateTask(id, body)
    return success(updated, '更新成功')
  })

  /** 删除定时任务 */
  app.delete('/api/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, request.params)
    const userId = (request as any).user.userId

    const task = getTaskByUser(id, userId)
    if (!task) {
      return reply.status(404).send(fail('TASK_NOT_FOUND', '任务不存在'))
    }

    deleteTask(id)
    return success(null, '删除成功')
  })

  /** 切换定时任务的启用状态 */
  app.post('/api/tasks/:id/toggle', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, request.params)
    const userId = (request as any).user.userId
    const body = request.body as { enabled: number }

    if (body.enabled !== 0 && body.enabled !== 1) {
      return reply.status(400).send(fail('VALIDATION_ERROR', 'enabled 必须为 0 或 1'))
    }

    const task = getTaskByUser(id, userId)
    if (!task) {
      return reply.status(404).send(fail('TASK_NOT_FOUND', '任务不存在'))
    }

    const updated = toggleTask(id, body.enabled)
    return success(updated, body.enabled ? '已开启' : '已关闭')
  })

  /** 立即执行一次定时任务 */
  app.post('/api/tasks/:id/run', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = validate(idParamSchema, request.params)
    const userId = (request as any).user.userId

    const task = getTaskByUser(id, userId)
    if (!task) {
      return reply.status(404).send(fail('TASK_NOT_FOUND', '任务不存在'))
    }

    try {
      const conversationId = await executeTask(task)
      return success({ conversationId }, '执行完成')
    } catch (err: any) {
      return reply.status(500).send(fail('EXECUTION_FAILED', err.message || '执行失败'))
    }
  })
}
