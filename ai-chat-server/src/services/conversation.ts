/**
 * src/services/conversation.ts —— 会话业务逻辑
 *
 * 封装会话的数据库操作：
 * - 查询列表（游标分页，按 updated_at 倒序）
 * - 创建/更新/删除
 * - 归属校验
 */
import { randomUUID } from 'node:crypto'
import db from '../database'
import type { Conversation } from '../types/index'

/**
 * 查询用户的会话列表（游标分页）
 *
 * 按 updated_at 降序排列，最新会话优先返回。
 * 游标值为上一页最后一条记录的 updated_at 时间戳。
 *
 * @param userId   - 用户 ID
 * @param cursor   - 游标（上一页最后一条的 updated_at，首次请求不传）
 * @param limit    - 每页条数，默认 20
 * @returns 分页结果，含 data / nextCursor / hasMore
 */
export function listConversations(
  userId: string,
  cursor?: string,
  limit = 20
): { data: Conversation[]; nextCursor: string | null; hasMore: boolean } {
  const cursorNum = cursor ? parseInt(cursor, 10) : Date.now()

  const rows = db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ? AND updated_at < ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).all(userId, cursorNum, limit + 1) as any[]

  const hasMore = rows.length > limit
  const data = rows.slice(0, limit).map(mapRow)

  return {
    data,
    nextCursor: hasMore && data.length > 0
      ? String(data[data.length - 1].updatedAt)
      : null,
    hasMore,
  }
}

/**
 * 创建新会话
 *
 * @param userId - 用户 ID
 * @param title  - 会话标题，默认为 "新对话"
 * @param model  - 使用的模型，默认 "deepseek-chat"
 * @returns 创建的会话
 */
export function createConversation(
  userId: string,
  title = '新对话',
  model = 'deepseek-chat',
  id?: string
): Conversation {
  const convId = id ?? randomUUID()
  const now = Date.now()

  db.prepare(`
    INSERT INTO conversations (id, user_id, title, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(convId, userId, title, model, now, now)

  return { id: convId, userId, title, model, createdAt: now, updatedAt: now }
}

/**
 * 根据 ID 查询单个会话
 *
 * @param id - 会话 ID
 * @returns 会话信息或 undefined
 */
export function getConversation(id: string): Conversation | undefined {
  const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as any
  if (!row) return undefined
  return mapRow(row)
}

/**
 * 校验会话是否属于指定用户
 *
 * @param id     - 会话 ID
 * @param userId - 用户 ID
 * @returns 属于该用户返回会话信息，否则返回 undefined
 */
export function getConversationByUser(
  id: string,
  userId: string
): Conversation | undefined {
  const conv = getConversation(id)
  if (!conv || conv.userId !== userId) return undefined
  return conv
}

/**
 * 更新会话（标题 / 模型）
 *
 * @param id     - 会话 ID
 * @param fields - 要更新的字段 { title?, model? }
 * @returns 更新后的会话信息，未找到返回 undefined
 */
export function updateConversation(
  id: string,
  fields: { title?: string; model?: string }
): Conversation | undefined {
  const conv = getConversation(id)
  if (!conv) return undefined

  const newTitle = fields.title ?? conv.title
  const newModel = fields.model ?? conv.model
  const now = Date.now()

  db.prepare(`
    UPDATE conversations SET title = ?, model = ?, updated_at = ? WHERE id = ?
  `).run(newTitle, newModel, now, id)

  return { ...conv, title: newTitle, model: newModel, updatedAt: now }
}

/**
 * 删除会话及其所有消息（外键级联）
 *
 * @param id - 会话 ID
 * @returns 是否成功删除
 */
export function deleteConversation(id: string): boolean {
  const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
  return result.changes > 0
}

/** 将数据库行映射为 Conversation 对象 */
function mapRow(row: any): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
