/**
 * src/utils/validators.ts —— Zod 校验工具
 * 
 * 对 Zod Schema 做 safeParse，失败时抛出 AppError（由全局错误处理器统一返回 400）。
 * 消除各路由中重复的 safeParse + flatten 样板代码。
 */

import type { ZodSchema } from 'zod'
import { AppError } from './appError'

/**
 * 校验请求数据，失败时抛出 VALIDATION_ERROR。
 * 
 * @param schema  Zod Schema
 * @param data   待校验数据（request.body / request.query 等）
 * @returns      通过校验后的类型安全数据
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      400,
      '请求参数校验失败',
      result.error.flatten().fieldErrors,
    )
  }
  return result.data
}
