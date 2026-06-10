/**
 * src/schemas/auth.ts —— 认证请求校验 Schema
 *
 * 使用 Zod 对注册 / 登录的请求体进行校验。
 */
import { z } from 'zod'

/** 注册请求校验 */
export const registerSchema = z.object({
  username: z
    .string()
    .min(2, '用户名至少 2 个字符')
    .max(32, '用户名最多 32 个字符'),
  password: z
    .string()
    .min(6, '密码至少 6 个字符')
    .max(128, '密码最多 128 个字符'),
})

/** 登录请求校验 */
export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})
