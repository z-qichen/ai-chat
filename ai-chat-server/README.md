# AI Chat Server

基于 Fastify 的 AI Chat 后端服务，对接 DeepSeek API，提供会话管理、消息游标分页、SSE 流式回复及用户认证。

## 技术栈

Fastify 5 + TypeScript + better-sqlite3 + OpenAI SDK + JWT + Zod

## 快速开始

```bash
cp .env.example .env      # 复制环境变量模板，按需修改
pnpm install
pnpm run dev              # 启动开发服务器 → http://localhost:4000
pnpm run build            # TypeScript 编译
pnpm run start            # 生产启动
```

## github仓库地址 git@github.com:z-qichen/ai-chat.git

## 项目状态 (2026-06-09)

### 已完成
- [x] 项目骨架 (Fastify 5 + TypeScript + SQLite)
- [x] 类型定义 (Message / Conversation / User / JwtPayload 等)
- [x] SQLite 数据库初始化 (users / conversations / messages / uploaded_files)
- [x] 插件注册 (CORS + JWT + Rate Limit + Multipart)
- [x] JWT 认证守卫 (`src/middlewares/auth.ts`)
- [x] 路由定义与注册 (认证 / 会话CRUD / 消息 / SSE流式 / 文件上传)
- [x] Service 层 (user / conversation / message / deepseek / file / chat)
- [x] `.env.example` 环境变量模板
- [x] 用户注册与登录 — scrypt 密码哈希 + Zod 校验
- [x] 会话 CRUD 完整逻辑 (创建、更新、删除、单个查询、归属校验、游标分页)
- [x] 消息游标分页查询 (按时间倒序，支持无限滚动加载历史消息)
- [x] SSE 流式对话 (加载历史 → 调用 DeepSeek API → 实时推送 chunk → 保存 AI 回复)
- [x] 文件识别处理 — 上传、文本提取(PDF/DOCX/代码)、图片 base64 编码、多模态消息构建

### 待完成
- [ ] 错误处理中间件 (统一错误格式)
- [ ] 单元测试
- [ ] Docker 部署支持

## 目录结构

```
src/
├── index.ts                  # 入口：创建 Fastify 实例，注册插件与路由，启动 HTTP 服务
├── config.ts                 # 环境变量配置（端口、JWT密钥、数据库路径、DeepSeek凭证、上传配置）
├── database.ts               # SQLite 连接管理 + 表结构初始化（users / conversations / messages / uploaded_files）
├── types/
│   └── index.ts              # 全局类型定义（与前端 src/types/index.ts 数据模型对齐）
├── plugins/
│   ├── cors.ts               # @fastify/cors 跨域配置
│   ├── jwt.ts                # @fastify/jwt 注册 + decorate authenticate 方法
│   └── rateLimit.ts          # @fastify/rate-limit 请求频率限制
├── middlewares/
│   └── auth.ts               # JWT 认证中间件（onRequest hook）
├── routes/
│   ├── index.ts              # 路由聚合注册
│   ├── auth.ts               # POST /api/auth/register | /api/auth/login
│   ├── conversations.ts      # 会话 CRUD（GET/POST/PATCH/DELETE /api/conversations）
│   ├── messages.ts           # 消息分页 + 保存消息
│   ├── chat.ts               # POST /api/conversations/:id/chat/stream（SSE 流式回复）
│   ├── files.ts              # POST /api/files/upload（文件上传） | GET /api/files/:id（文件元数据）
│   └── models.ts             # POST /api/models/validate（模型校验）
└── services/
    ├── user.ts               # 用户数据库操作（注册、查询）
    ├── conversation.ts       # 会话数据库操作（CRUD、游标分页）
    ├── message.ts            # 消息数据库操作（列表分页、创建）
    ├── deepseek.ts           # DeepSeek API 代理（chat + chatStream），封装 OpenAI SDK
    ├── file.ts               # 文件处理服务（存储、文本提取、图片编码）
    └── chat.ts               # 聊天消息构建服务（历史消息 + 文件 → OpenAI 多模态格式）
```

## API 路由

### 认证（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（username + password → token + user + conversations[]） |
| POST | `/api/auth/login` | 登录（username + password → token + user + conversations[]） |

登录/注册响应格式：
```json
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "username": "zhangsan" },
  "conversations": [
    { "id": "uuid", "userId": "uuid", "title": "新对话", "model": "deepseek-chat", "createdAt": 1700000000000, "updatedAt": 1700000000000 }
  ]
}
```

### 会话（需要 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations` | 会话列表，query: `?cursor=xxx&limit=20` |
| POST | `/api/conversations` | 创建会话，body: `{ title?, model? }` |
| GET | `/api/conversations/:id` | 单个会话详情 |
| PATCH | `/api/conversations/:id` | 更新会话，body: `{ title?, model? }` |
| DELETE | `/api/conversations/:id` | 删除会话及所有消息 |

### 消息（需要 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations/:id/messages` | 消息列表，query: `?cursor=xxx&limit=50` |
| POST | `/api/conversations/:id/messages` | 保存消息，body: `{ role, content, files? }` |

`files` 字段为 JSON 字符串数组，存储已上传文件的 fileId 引用：
```json
{
  "role": "user",
  "content": "分析这张图和文档",
  "files": "[\"file-uuid-1\", \"file-uuid-2\"]"
}
```

### 流式对话（需要 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/conversations/:id/chat/stream` | SSE 流式回复，body: `{ model? }`，Response: `text/event-stream` |

对话时后端自动加载历史消息中的 `files` 引用，处理文件内容并构建多模态消息发送给 AI。

### 文件上传（需要 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/files/upload` | 上传文件（multipart/form-data），单次一个文件 |
| GET | `/api/files/:id` | 查询文件元数据 |

**上传请求：** `Content-Type: multipart/form-data`，字段名 `file`

**上传响应：**
```json
{
  "fileId": "uuid",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "size": 12345
}
```

**支持的文件类型：**
| 类别 | MIME 类型 | 处理方式 |
|------|----------|---------|
| 图片 | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | base64 编码 → Vision API |
| PDF | `application/pdf` | 文本提取（pdf-parse） |
| Word | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 文本提取（mammoth） |
| 文本/代码 | `text/plain`, `text/markdown`, `text/html`, `text/css`, `text/javascript`, `application/json`, `application/xml` 及 `.js/.ts/.py` 等 | 直接读取 UTF-8 |
| 其他 | — | 忽略（仅保留文件元数据） |

**文件上传大小限制：** 10MB（可通过 `MAX_FILE_SIZE` 环境变量配置）

### 公共

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |

## 数据模型

### 数据库表

- **users** — `id`, `username`(UNIQUE), `password_hash`, `created_at`
- **conversations** — `id`, `user_id`(FK), `title`, `model`, `created_at`, `updated_at`
- **messages** — `id`, `conversation_id`(FK), `role`, `content`, `timestamp`, `files`
- **uploaded_files** — `id`, `user_id`(FK), `original_name`, `mime_type`, `size`, `stored_path`, `extracted_text`, `created_at`

### 文件处理流程

```
前端上传文件 → POST /api/files/upload (multipart)
  → 写磁盘 data/files/{uuid}.ext
  → 插入 uploaded_files 表
  → 返回 { fileId, originalName, mimeType, size }

前端保存消息 → POST /api/conversations/:id/messages
  → Body: { role:"user", content:"分析这个", files:'["fileId1","fileId2"]' }
  → 存入 messages.files 字段

前端触发对话 → POST /api/conversations/:id/chat/stream
  → buildMessages() 加载历史消息
  → 遍历消息的 files 字段，查 uploaded_files 表
  → 图片 → processImage() 读取磁盘 base64 编码
  → 文档 → extractText() 提取文本，缓存到 extracted_text 字段
  → 构建 OpenAI 多模态消息（纯文本或 ContentPart[]）
  → 调用 DeepSeek 流式 API
  → SSE 推送 token 到客户端
```

### 游标分页

列表接口统一使用游标分页（cursor-based pagination），避免深度分页性能问题。

请求：`GET /api/conversations?cursor=1700000000000&limit=20`

响应：
```json
{
  "data": [...],
  "nextCursor": "1699000000000",
  "hasMore": true
}
```

### SSE 流式协议

```
POST /api/conversations/:id/chat/stream
Content-Type: application/json
Authorization: Bearer <token>

{"model":"deepseek-chat"}

--- 响应 ---
Content-Type: text/event-stream

data: {"content":"你好","done":false}

data: {"content":"！","done":false}

data: {"content":"有","done":false}

data: {"content":"什么","done":false}

data: {"content":"可以帮你的？","done":false}

data: {"content":"","done":true}
```

> 注意：用户消息应在调用此接口前通过 `POST /api/conversations/:id/messages` 保存。
> 如果消息中包含 `files` 引用，后端会自动处理文件内容并以多模态格式发送给 AI。

## 架构约定

- 所有文件使用 ES Module (`"type": "module"`)
- 路径别名 `@/` → `src/`（已配置 tsconfig paths）
- 公共类型集中在 `src/types/index.ts`
- 路由层只做参数校验和响应，业务逻辑下沉到 `src/services/`
- 插件使用 `fastify-plugin` 包装，通过 `app.register()` 加载
- 数据库使用 better-sqlite3 同步 API，适合单进程开发场景
- JWT 认证通过 `onRequest` hook 注入，被保护路由统一调用 `authGuard`
- **代码注释**：每个文件必须包含文件级 JSDoc 注释（说明职责、数据结构、核心流程），关键函数需标注参数/返回值/用途，复杂逻辑需有行内注释。注释语言统一使用中文，方便团队成员阅读理解
- 敏感信息（API Key、JWT Secret）一律通过环境变量注入，不硬编码
- 密码使用 Node.js 原生 `crypto.scryptSync` 哈希存储（16 字节盐 + 64 字节密钥，hex 编码格式 `salt:hash`），无需 bcrypt 等外部依赖
