/**
 * src/database.ts —— SQLite 数据库初始化与连接管理
 *
 * 使用 better-sqlite3 提供同步 API，适合单进程场景。
 * 初始化时自动创建所需的表结构。
 */
import Database from 'better-sqlite3'
import { config } from './config'
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

// v6 迁移：新增 tool_calls 列支持工具调用记录持久化
try {
  db.exec('ALTER TABLE messages ADD COLUMN tool_calls TEXT')
} catch {
  // 列已存在，忽略
}

// v7 迁移：conversations 表新增 from_task_id 列
try {
  db.exec('ALTER TABLE conversations ADD COLUMN from_task_id TEXT')
} catch {
  // 列已存在，忽略
}

// v8 迁移：定时任务表
db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    title           TEXT NOT NULL,
    prompt          TEXT NOT NULL,
    frequency_type  TEXT NOT NULL CHECK(frequency_type IN ('once','daily','weekly','monthly')),
    time            TEXT NOT NULL,
    day_of_week     INTEGER,
    day_of_month    INTEGER,
    next_run_at     TEXT,
    last_run_at     TEXT,
    enabled         INTEGER NOT NULL DEFAULT 1,
    result_conversation_id TEXT,
    expires_at      TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user_id
    ON scheduled_tasks(user_id);

  CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
    ON scheduled_tasks(enabled, next_run_at);
`)

// v14 迁移：定时任务新增 deep_think 和 web_search 开关
try {
  db.exec('ALTER TABLE scheduled_tasks ADD COLUMN deep_think INTEGER DEFAULT 0')
} catch { /* 列已存在 */ }
try {
  db.exec('ALTER TABLE scheduled_tasks ADD COLUMN web_search INTEGER DEFAULT 0')
} catch { /* 列已存在 */ }

// v5 迁移：用户系统提示词列
try {
  db.exec('ALTER TABLE users ADD COLUMN system_prompt TEXT')
} catch {
  // 列已存在，忽略
}

// v4 迁移：用户记忆表，支持跨对话记忆持久化
db.exec(`
  CREATE TABLE IF NOT EXISTS user_memories (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    category   TEXT NOT NULL CHECK(category IN ('identity','address','preference','background','other')),
    key        TEXT NOT NULL,
    value      TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    source     TEXT NOT NULL DEFAULT 'auto' CHECK(source IN ('auto','manual')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, key)
  );

  CREATE INDEX IF NOT EXISTS idx_user_memories_user_id
    ON user_memories(user_id);
`)

export default db
