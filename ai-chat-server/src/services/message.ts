/**
 * src/services/message.ts —— 消息业务逻辑
 *
 * 封装消息的数据库操作：
 * - 列表查询（游标分页）
 * - 创建/追加消息
 */
import { randomUUID } from 'node:crypto'
import db from '../database'
import type { Message } from '../types/index'

export function listMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
): { data: Message[]; nextCursor: string | null; hasMore: boolean; total: number } {
  const total = (db.prepare(`
    SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?
  `).get(conversationId) as any).count as number

  const cursorNum = cursor ? parseInt(cursor, 10) : Date.now()
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ? AND timestamp < ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(conversationId, cursorNum, limit + 1) as any[]
  const hasMore = rows.length > limit
  const data = rows.slice(0, limit).map(mapRow)
  return {
    data,
    nextCursor: hasMore && data.length > 0
      ? String(data[data.length - 1].timestamp)
      : null,
    hasMore,
    total,
  }
}

export function createMessage(msg: Omit<Message, 'id'>): Message {
  const id = randomUUID()
  const toolCallsJson = msg.toolCalls?.length ? JSON.stringify(msg.toolCalls) : null
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, timestamp, files, reasoning_content, partial, tool_calls)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, msg.conversationId, msg.role, msg.content, msg.timestamp, msg.files ?? null, msg.reasoningContent ?? null, msg.partial ? 1 : 0, toolCallsJson)
  return { id, ...msg }
}

export function listAllMessages(conversationId: string): Message[] {
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY timestamp ASC
  `).all(conversationId) as any[]
  return rows.map(mapRow)
}

function mapRow(row: any): Message {
  let toolCalls: Message['toolCalls'] = null
  if (row.tool_calls) {
    try {
      const parsed = JSON.parse(row.tool_calls)
      if (Array.isArray(parsed) && parsed.length > 0) {
        toolCalls = parsed
      }
    } catch { /* JSON 解析失败忽略 */ }
  }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp,
    files: row.files,
    reasoningContent: row.reasoning_content,
    toolCalls,
    partial: row.partial ? true : false,
  }
}

export function updateMessage(
  id: string,
  updates: { content?: string; partial?: boolean; reasoningContent?: string | null; toolCalls?: Array<any> | null }
): void {
  const sets: string[] = []
  const values: any[] = []

  if (updates.content !== undefined) {
    sets.push('content = ?')
    values.push(updates.content)
  }
  if (updates.partial !== undefined) {
    sets.push('partial = ?')
    values.push(updates.partial ? 1 : 0)
  }
  if (updates.reasoningContent !== undefined) {
    sets.push('reasoning_content = ?')
    values.push(updates.reasoningContent)
  }
  if (updates.toolCalls !== undefined) {
    sets.push('tool_calls = ?')
    values.push(updates.toolCalls?.length ? JSON.stringify(updates.toolCalls) : null)
  }

  if (sets.length > 0) {
    values.push(id)
    db.prepare(`UPDATE messages SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }
}
