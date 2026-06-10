/**
 * src/database.ts —— SQLite 数据库初始化与连接管理
 *
 * 使用 better-sqlite3 提供同步 API，适合单进程场景。
 * 初始化时自动创建所需的表结构。
 */
import Database from 'better-sqlite3'
import { config } from './config.ts'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.dirname(config.db.path)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

export const db = new Database(config.db.path)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    username     TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    title      TEXT NOT NULL DEFAULT '新对话',
    model      TEXT NOT NULL DEFAULT 'deepseek-chat',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_user_id
    ON conversations(user_id);

  CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
    ON conversations(user_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content         TEXT NOT NULL DEFAULT '',
    timestamp       INTEGER NOT NULL,
    files           TEXT,
    reasoning_content TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

`)

// v2 迁移：支持消息截断/继续生成（列已存在时忽略）
try {
  db.exec('ALTER TABLE messages ADD COLUMN partial INTEGER DEFAULT 0')
} catch {
  // 列已存在（新建数据库场景），忽略
}

db.exec(`

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
    ON messages(conversation_id, timestamp DESC);

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    original_name  TEXT NOT NULL,
    mime_type      TEXT NOT NULL,
    size           INTEGER NOT NULL,
    stored_path    TEXT NOT NULL,
    extracted_text TEXT,
    created_at     INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id
    ON uploaded_files(user_id);
`)

// v3 迁移：新增 reasoning_content 列支持深度思考
try {
  db.exec('ALTER TABLE messages ADD COLUMN reasoning_content TEXT')
} catch {
  // 列已存在，忽略
}

export default db
