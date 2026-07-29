/**
 * src/utils/appError.ts —— 自定义业务异常类
 * 
 * Service 层抛出 AppError，全局错误处理器根据 statusCode 返回对应 HTTP 状态码。
 * 原生 Error 或未识别异常统一兜底为 500。
 */

export class AppError extends Error {
  /** 业务错误码，如 "CONVERSATION_NOT_FOUND" */
  code: string
  /** HTTP 状态码 */
  statusCode: number
  /** 附加详情（如字段级校验错误） */
  details?: unknown

  constructor(code: string, statusCode: number, message: string, details?: unknown) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.name = 'AppError'
  }
}
