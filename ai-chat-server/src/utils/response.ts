/**
 * utils/response.ts —— 统一响应格式
 *
 * 成功响应: { code: 0, message: 'ok', data: T }
 * 错误响应: { code: string, message: string, data: null }
 */

export interface ApiResponse<T = unknown> {
  code: number | string
  message: string
  data: T | null
}

/** 构建成功响应 */
export function success<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, message, data }
}

/** 构建失败响应 */
export function fail(code: string, message: string): ApiResponse<null> {
  return { code, message, data: null }
}
