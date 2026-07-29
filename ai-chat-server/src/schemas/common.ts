/**
 * src/schemas/common.ts —— 通用校验 Schema
 *
 * 提供跨路由复用的通用参数校验 Schema。
 */
import { z } from 'zod'

/** 路径参数 :id 校验 —— 非空字符串（兼容 conv_ 前缀和 UUID 格式） */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID 不能为空'),
})
