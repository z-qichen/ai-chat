/**
 * src/services/memory.ts —— 用户记忆服务
 *
 * 提供用户记忆的增删查、系统提示词注入、以及 AI tool_call 结果处理。
 * 记忆持久化在 SQLite user_memories 表中，按 (user_id, key) 唯一去重。
 */
import { randomUUID } from 'node:crypto'
import db from '../database.ts'
import type { MemoryItem, ExtractMemoryArgs } from '../types/index.ts'

/** 记忆分类的中文标签映射 */
const CATEGORY_LABELS: Record<MemoryItem['category'], string> = {
  identity: '身份',
  address: '住址',
  preference: '偏好',
  background: '背景',
  other: '其他',
}

const EXTRACT_USER_INFO_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_user_info',
    description: `从当前对话中提取用户新透露的个人信息，持久化存储以便后续对话参考。
仅在用户主动透露新的个人信息时调用，不要重复提取已经知道的旧信息。
信息类别：
- identity: 姓名、年龄、性别、职业等身份信息
- address: 住址、城市、国家等地理信息
- preference: 偏好、喜好、风格要求、习惯
- background: 教育、工作背景、技术栈、经验
- other: 其他值得记录的个性化信息`,
    parameters: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['identity', 'address', 'preference', 'background', 'other'],
          description: '信息类别',
        },
        key: {
          type: 'string',
          description: '字段名，如"姓名"、"城市"、"回复风格偏好"、"编程语言"',
        },
        value: {
          type: 'string',
          description: '提取的具体信息值',
        },
        confidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: '置信度，1.0=明确陈述，0.5=推测',
        },
      },
      required: ['category', 'key', 'value', 'confidence'],
    },
  },
}

/** 获取 extract_user_info 工具定义（用于传给 LLM） */
export function getMemoryTool() {
  return EXTRACT_USER_INFO_TOOL
}

/** 查询用户所有记忆 */
export function listMemories(userId: string): MemoryItem[] {
  const rows = db.prepare(`
    SELECT * FROM user_memories WHERE user_id = ? ORDER BY updated_at DESC
  `).all(userId) as any[]
  return rows.map(mapRow)
}

/** 插入或更新一条记忆（按 user_id + key 唯一约束去重） */
export function upsertMemory(
  userId: string,
  category: MemoryItem['category'],
  key: string,
  value: string,
  confidence = 1.0,
  source: 'auto' | 'manual' = 'auto'
): MemoryItem {
  const now = Date.now()
  const existing = db.prepare(`
    SELECT id, created_at FROM user_memories WHERE user_id = ? AND key = ?
  `).get(userId, key) as any

  if (existing) {
    db.prepare(`
      UPDATE user_memories SET category = ?, value = ?, confidence = ?, source = ?, updated_at = ?
      WHERE id = ?
    `).run(category, value, confidence, source, now, existing.id)
    return {
      id: existing.id,
      userId,
      category,
      key,
      value,
      confidence,
      source,
      createdAt: existing.created_at,
      updatedAt: now,
    }
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO user_memories (id, user_id, category, key, value, confidence, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, category, key, value, confidence, source, now, now)

  return { id, userId, category, key, value, confidence, source, createdAt: now, updatedAt: now }
}

/** 删除一条记忆 */
export function deleteMemory(id: string, userId: string): boolean {
  const result = db.prepare('DELETE FROM user_memories WHERE id = ? AND user_id = ?').run(id, userId)
  return result.changes > 0
}

/** 处理 LLM 返回的 extract_user_info tool_calls，批量存入记忆 */
export function handleExtractToolCalls(
  toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>,
  userId: string
): number {
  let count = 0
  for (const tc of toolCalls) {
    if (tc.function.name !== 'extract_user_info') continue
    try {
      const args: ExtractMemoryArgs = JSON.parse(tc.function.arguments)
      if (args.confidence < 0.3) continue
      upsertMemory(userId, args.category, args.key, args.value, args.confidence, 'auto')
      count++
    } catch {
      // JSON 解析失败，跳过此条
    }
  }
  return count
}

/**
 * 将用户记忆注入系统提示词
 *
 * @param userId          - 用户 ID
 * @param baseSystemPrompt - 原始系统提示词
 * @returns 注入记忆后的系统提示词
 */
export function injectMemoriesIntoSystemPrompt(userId: string, baseSystemPrompt: string): string {
  const memories = listMemories(userId)
  if (memories.length === 0) return baseSystemPrompt

  const grouped = new Map<MemoryItem['category'], MemoryItem[]>()
  for (const m of memories) {
    if (!grouped.has(m.category)) grouped.set(m.category, [])
    grouped.get(m.category)!.push(m)
  }

  const lines: string[] = []
  lines.push('')
  lines.push('## 用户档案')
  lines.push('以下是你已知的当前用户信息，请据此个性化回复：')

  for (const [category, items] of grouped) {
    const label = CATEGORY_LABELS[category] || category
    for (const item of items) {
      lines.push(`- [${label}] ${item.key}：${item.value}`)
    }
  }

  return baseSystemPrompt + '\n' + lines.join('\n')
}

function mapRow(row: any): MemoryItem {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    key: row.key,
    value: row.value,
    confidence: row.confidence,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
