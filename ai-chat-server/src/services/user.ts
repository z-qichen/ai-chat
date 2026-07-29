/**
 * src/services/user.ts —— 用户业务逻辑
 *
 * 封装用户的数据库操作：
 * - 注册（scrypt 哈希密码 → 写入数据库）
 * - 登录验证（比对密码 → 返回用户信息）
 *
 * 密码存储格式：salt:hash（hex 编码，16 字节盐 + 64 字节哈希）
 */
import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import db from '../database'
import type { User } from '../types/index'

/** 盐长度（字节） */
const SALT_LENGTH = 16
/** scrypt 密钥长度（字节） */
const KEY_LENGTH = 64

/**
 * 对明文密码进行哈希，返回 `salt:hash` 格式字符串
 */
function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${hash}`
}

/**
 * 验证明文密码是否与存储的哈希匹配
 */
function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const derived = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(hash, 'hex')
  if (derived.length !== expected.length) return false
  return timingSafeEqual(derived, expected)
}

/**
 * 创建新用户（注册）
 *
 * @param username - 用户名
 * @param password - 明文密码
 * @returns 创建的用户信息（不含密码哈希）
 */
export function createUser(username: string, password: string): User {
  const id = randomUUID()
  const passwordHash = hashPassword(password)
  const createdAt = Date.now()

  const stmt = db.prepare(`
    INSERT INTO users (id, username, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `)
  stmt.run(id, username, passwordHash, createdAt)

  return { id, username, passwordHash, createdAt }
}

/**
 * 验证用户登录凭据
 *
 * @param username - 用户名
 * @param password - 明文密码
 * @returns 验证成功返回用户信息，失败返回 null
 */
export function verifyLogin(username: string, password: string): User | null {
  const row = db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).get(username) as any

  if (!row) return null
  if (!verifyPassword(password, row.password_hash)) return null

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

/**
 * 根据用户名查询用户
 *
 * @param username - 用户名
 * @returns 用户信息或 undefined
 */
export function findUserByUsername(username: string): User | undefined {
  const row = db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).get(username) as any

  if (!row) return undefined

  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  }
}

/**
 * 获取用户系统提示词
 *
 * @param userId - 用户 ID
 * @returns 系统提示词文本，未设置则返回 null
 */
export function getUserSystemPrompt(userId: string): string | null {
  const row = db.prepare(
    'SELECT system_prompt FROM users WHERE id = ?'
  ).get(userId) as any

  return row?.system_prompt ?? null
}

/**
 * 更新用户系统提示词
 *
 * @param userId - 用户 ID
 * @param systemPrompt - 系统提示词文本
 */
export function updateUserSystemPrompt(userId: string, systemPrompt: string): void {
  db.prepare(
    'UPDATE users SET system_prompt = ? WHERE id = ?'
  ).run(systemPrompt, userId)
}
