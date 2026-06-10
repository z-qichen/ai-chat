/**
 * src/schemas/conversation.ts —— 会话请求校验 Schema
 *
 * 使用 Zod 对会话的创建、更新、分页请求进行校验。
 */
import { z } from 'zod'
import { config } from '../config.ts'

/** 支持的模型枚举 */
const modelEnum = z.enum(config.models as unknown as [string, ...string[]])

/** 创建会话校验 */
export const createConversationSchema = z.object({
  title: z.string().max(30, '标题最多 30 个字符').optional(),
  model: modelEnum.optional(),
})

/** 更新会话校验 —— 至少需要一个字段 */
export const updateConversationSchema = z
  .object({
    title: z.string().max(30, '标题最多 30 个字符').optional(),
    model: modelEnum.optional(),
  })
  .refine((data) => data.title !== undefined || data.model !== undefined, {
    message: '至少需要提供 title 或 model 之一',
  })

/** 分页查询参数校验 */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1, '每页至少 1 条').max(100, '每页最多 100 条').optional().default(20),
})
