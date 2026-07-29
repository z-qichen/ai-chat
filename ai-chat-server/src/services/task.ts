/**
 * src/services/task.ts —— 定时任务业务逻辑
 *
 * 封装定时任务的数据库操作：
 * - 查询列表（按创建时间倒序）
 * - 创建/更新/删除
 * - 切换启用状态
 * - 计算下次执行时间
 */
import { randomUUID } from 'node:crypto'
import db from '../database'
import type { ScheduledTask } from '../types/index'

/** 计算下次执行时间 */
export function calcNextRunAt(
  frequencyType: ScheduledTask['frequencyType'],
  time: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): string | null {
  if (frequencyType === 'once') return null

  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const next = new Date(now)
  next.setHours(h, m, 0, 0)

  if (frequencyType === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (frequencyType === 'weekly' && dayOfWeek != null) {
    const currentDay = next.getDay()
    let daysUntil = dayOfWeek - currentDay
    if (daysUntil <= 0) daysUntil += 7
    next.setDate(next.getDate() + daysUntil)
    return next.toISOString()
  }

  if (frequencyType === 'monthly' && dayOfMonth != null) {
    next.setDate(dayOfMonth)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
    }
    return next.toISOString()
  }

  return null
}

/** 获取用户的定时任务列表 */
export function listTasks(userId: string): ScheduledTask[] {
  const rows = db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as any[]

  return rows.map(mapRow)
}

/** 创建定时任务 */
export function createTask(
  userId: string,
  params: {
    title: string
    prompt: string
    frequencyType: ScheduledTask['frequencyType']
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
    expiresAt?: string
    deepThink?: number
    webSearch?: number
  }
): ScheduledTask {
  const id = randomUUID()
  const now = Date.now()
  const { title, prompt, frequencyType, time, dayOfWeek, dayOfMonth, expiresAt, deepThink = 0, webSearch = 0 } = params

  const nextRunAt = calcNextRunAt(frequencyType, time, dayOfWeek, dayOfMonth)

  // 计算过期时间
  let expires: string | null = expiresAt ?? null
  if (!expires && frequencyType !== 'once') {
    const expireDate = new Date()
    if (frequencyType === 'daily') expireDate.setDate(expireDate.getDate() + 7)
    else if (frequencyType === 'weekly') expireDate.setDate(expireDate.getDate() + 30)
    else if (frequencyType === 'monthly') expireDate.setDate(expireDate.getDate() + 90)
    expires = expireDate.toISOString()
  }

  db.prepare(`
    INSERT INTO scheduled_tasks (id, user_id, title, prompt, frequency_type, time, day_of_week, day_of_month, next_run_at, expires_at, deep_think, web_search, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, title, prompt, frequencyType, time, dayOfWeek ?? null, dayOfMonth ?? null, nextRunAt, expires, deepThink, webSearch, now, now)

  return mapRow(db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any)
}

/** 查询单个任务（含归属校验） */
export function getTaskByUser(id: string, userId: string): ScheduledTask | undefined {
  const row = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ? AND user_id = ?').get(id, userId) as any
  if (!row) return undefined
  return mapRow(row)
}

/** 更新定时任务 */
export function updateTask(
  id: string,
  fields: {
    title?: string
    prompt?: string
    frequencyType?: ScheduledTask['frequencyType']
    time?: string
    dayOfWeek?: number | null
    dayOfMonth?: number | null
    enabled?: number
    expiresAt?: string | null
    deepThink?: number
    webSearch?: number
  }
): ScheduledTask | undefined {
  const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any
  if (!existing) return undefined

  const now = Date.now()
  const frequencyType = fields.frequencyType ?? existing.frequency_type
  const time = fields.time ?? existing.time
  const dayOfWeek = fields.dayOfWeek !== undefined ? fields.dayOfWeek : existing.day_of_week
  const dayOfMonth = fields.dayOfMonth !== undefined ? fields.dayOfMonth : existing.day_of_month
  const enabled = fields.enabled !== undefined ? fields.enabled : existing.enabled
  const expiresAt = fields.expiresAt !== undefined ? fields.expiresAt : existing.expires_at
  const deepThink = fields.deepThink !== undefined ? fields.deepThink : (existing.deep_think ?? 0)
  const webSearch = fields.webSearch !== undefined ? fields.webSearch : (existing.web_search ?? 0)

  const nextRunAt = enabled
    ? calcNextRunAt(frequencyType, time, dayOfWeek, dayOfMonth)
    : null

  db.prepare(`
    UPDATE scheduled_tasks SET
      title = ?, prompt = ?, frequency_type = ?, time = ?,
      day_of_week = ?, day_of_month = ?, enabled = ?,
      next_run_at = ?, expires_at = ?, deep_think = ?, web_search = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    fields.title ?? existing.title,
    fields.prompt ?? existing.prompt,
    frequencyType,
    time,
    dayOfWeek,
    dayOfMonth,
    enabled,
    nextRunAt,
    expiresAt,
    deepThink,
    webSearch,
    now,
    id
  )

  return mapRow(db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any)
}

/** 删除定时任务 */
export function deleteTask(id: string): boolean {
  const result = db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
  return result.changes > 0
}

/** 切换任务的启用状态 */
export function toggleTask(id: string, enabled: number): ScheduledTask | undefined {
  const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any
  if (!existing) return undefined

  const now = Date.now()
  const nextRunAt = enabled
    ? calcNextRunAt(existing.frequency_type, existing.time, existing.day_of_week, existing.day_of_month)
    : null

  db.prepare(`
    UPDATE scheduled_tasks SET enabled = ?, next_run_at = ?, updated_at = ? WHERE id = ?
  `).run(enabled, nextRunAt, now, id)

  return mapRow(db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any)
}

/** 获取所有到期待执行的任务 */
export function getDueTasks(): ScheduledTask[] {
  const now = new Date().toISOString()
  const rows = db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
    ORDER BY next_run_at ASC
  `).all(now) as any[]

  return rows.map(mapRow)
}

/** 更新任务的上次执行时间、下次执行时间、关联对话 ID */
export function updateTaskRunInfo(
  id: string,
  resultConversationId: string
): void {
  const existing = db.prepare('SELECT * FROM scheduled_tasks WHERE id = ?').get(id) as any
  if (!existing) return

  const now = Date.now()
  const nextRunAt = calcNextRunAt(
    existing.frequency_type,
    existing.time,
    existing.day_of_week,
    existing.day_of_month
  )

  db.prepare(`
    UPDATE scheduled_tasks SET
      last_run_at = ?, next_run_at = ?, result_conversation_id = ?, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), nextRunAt, resultConversationId, now, id)

  // 单次任务执行后自动关闭
  if (existing.frequency_type === 'once') {
    db.prepare('UPDATE scheduled_tasks SET enabled = 0, updated_at = ? WHERE id = ?').run(now, id)
  }
}

/** 将数据库行映射为 ScheduledTask 对象 */
function mapRow(row: any): ScheduledTask {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    prompt: row.prompt,
    frequencyType: row.frequency_type,
    time: row.time,
    dayOfWeek: row.day_of_week,
    dayOfMonth: row.day_of_month,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    enabled: row.enabled,
    resultConversationId: row.result_conversation_id,
    expiresAt: row.expires_at,
    deepThink: row.deep_think ?? 0,
    webSearch: row.web_search ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
