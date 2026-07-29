/**
 * src/plugins/errorHandler.ts —— 全局错误处理插件
 * 
 * 1. setErrorHandler: 捕获所有未处理的异常，按类型返回不同状态码
 *    - ZodError     → 400（校验失败，包含字段级详情）
 *    - AppError     → 对应 statusCode
 *    - 其他 Error   → 500（生产环境不泄露堆栈）
 * 
 * 2. setNotFoundHandler: 统一 404 响应格式
 */

import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../utils/appError'
import { fail } from '../utils/response'

export default async function errorHandlerPlugin(app: FastifyInstance) {
  /**
   * 全局错误处理器 —— 兜底所有未捕获异常
   */
  app.setErrorHandler((err, _request, reply) => {
    // 1. Zod 校验错误 → 400
    if (err instanceof ZodError) {
      return reply.status(400).send(
        fail('VALIDATION_ERROR', '请求参数校验失败')
      )
    }

    // 2. 自定义业务异常 → 对应 HTTP 状态码
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(
        fail(err.code, err.message)
      )
    }

    // 3. 其余未识别异常 → 500，不泄露堆栈
    app.log.error(err, '未捕获的服务端错误')
    return reply.status(500).send(
      fail('INTERNAL_ERROR', '服务器内部错误')
    )
  })

  /**
   * 统一 404 处理器 —— 未匹配到任何路由时
   */
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send(
      fail('NOT_FOUND', '请求的资源不存在')
    )
  })
}
