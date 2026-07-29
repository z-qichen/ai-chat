/**
 * src/routes/models.ts —— 模型校验路由
 *
 * GET  /api/models           —— 返回支持的模型列表（含展示标签）
 * POST /api/models/validate  —— 校验模型名称是否合法
 *
 * 前端传入用户期望的模型名称，后端校验：
 * 1. 格式是否合法（非空字符串）
 * 2. 是否在支持的模型列表中
 * 3. 若不在列表中，通过相似度匹配给出最近似的建议
 */
import type { FastifyInstance } from 'fastify'
import { config } from '../config'
import type { ValidateModelBody, ValidateModelResponse } from '../types/index'
import { success } from '../utils/response'

/** 模型展示标签映射 */
const MODEL_LABELS: Record<string, string> = {
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
  'deepseek-v4-flash': 'DeepSeek V4 Flash',
}

/**
 * 计算两个字符串的编辑距离（Levenshtein Distance）
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  )

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1
      }
    }
  }

  return dp[m][n]
}

/**
 * 在支持的模型列表中查找与输入最相似的模型
 * 返回相似度最高的模型名，若最低编辑距离超过阈值则返回 null
 */
function findClosestModel(input: string): string | null {
  const lowerInput = input.toLowerCase()
  const threshold = Math.max(3, Math.floor(lowerInput.length * 0.5))

  let closest: string | null = null
  let minDistance = Infinity

  for (const m of config.models) {
    const distance = levenshtein(lowerInput, m.toLowerCase())
    if (distance < minDistance) {
      minDistance = distance
      closest = m
    }
  }

  if (closest && minDistance <= threshold) {
    return closest
  }

  return null
}

export default async function modelRoutes(app: FastifyInstance) {
  /** 获取支持的模型列表 */
  app.get('/api/models', async () => {
    return success(config.models.map((value) => ({
      value,
      label: MODEL_LABELS[value] ?? value,
    })))
  })

  app.post(
    '/api/models/validate',
    async (request, reply) => {
      const { model } = request.body as ValidateModelBody

      const trimmed = model?.trim()
      if (!trimmed) {
        reply.code(400)
        return success({ valid: false, error: '模型名称不能为空' })
      }

      const normalized = trimmed.toLowerCase()

      const exactMatch = config.models.find(
        (m) => m.toLowerCase() === normalized
      )
      if (exactMatch) {
        return success({ valid: true, model: exactMatch })
      }

      const suggestion = findClosestModel(normalized)

      reply.code(400)
      if (suggestion) {
        return success({
          valid: false,
          error: `模型 "${trimmed}" 不存在，您是否想使用 "${suggestion}"？`,
          suggestion,
        })
      }

      return success({
        valid: false,
        error: `模型 "${trimmed}" 不在支持列表中，当前支持：${config.models.join('、')}`,
      })
    }
  )
}
