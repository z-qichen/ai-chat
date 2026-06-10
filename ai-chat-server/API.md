# AI Chat Server — API 接口文档

> 后端服务基地址：`http://localhost:4000`
> 需要认证的接口在 Header 中携带 `Authorization: Bearer <token>`

---

## 1. 认证

### POST /api/auth/register — 注册

无需认证。

**请求体：**
```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**响应 `200`：**
```json
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "username": "zhangsan" },
  "conversations": []
}
```

### POST /api/auth/login — 登录

无需认证。

**请求体：**
```json
{
  "username": "zhangsan",
  "password": "123456"
}
```

**响应 `200`：**
```json
{
  "token": "eyJhbG...",
  "user": { "id": "uuid", "username": "zhangsan" },
  "conversations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "新对话",
      "model": "deepseek-chat",
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  ]
}
```

---

## 2. 会话

### GET /api/conversations — 会话列表

需要认证。游标分页。

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| cursor | string | 当前时间戳 | 分页游标 |
| limit | number | 20 | 每页条数 |

**响应：**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "新对话",
      "model": "deepseek-chat",
      "createdAt": 1700000000000,
      "updatedAt": 1700000000000
    }
  ],
  "nextCursor": "1699000000000",
  "hasMore": true
}
```

### POST /api/conversations — 创建会话

需要认证。

**请求体：**
```json
{
  "title": "新对话",
  "model": "deepseek-chat"
}
```

### GET /api/conversations/:id — 会话详情

需要认证。返回单个会话信息。

### PATCH /api/conversations/:id — 更新会话

需要认证。

**请求体（字段均可选）：**
```json
{
  "title": "新标题",
  "model": "deepseek-reasoner"
}
```

### DELETE /api/conversations/:id — 删除会话

需要认证。会级联删除该会话下的所有消息。

---

## 3. 消息

### GET /api/conversations/:id/messages — 消息列表

需要认证。游标分页。

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| cursor | string | 当前时间戳 | 分页游标 |
| limit | number | 50 | 每页条数 |

### POST /api/conversations/:id/messages — 保存消息

需要认证。不触发 AI，仅存入数据库。

**请求体：**
```json
{
  "role": "user",
  "content": "分析这张图和文档",
  "files": "[\"file-uuid-1\", \"file-uuid-2\"]"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| role | string | 是 | `user` / `assistant` / `system` |
| content | string | 是 | 消息文本 |
| files | string? | 否 | JSON 字符串数组，已上传文件的 fileId 引用 |

---

## 4. 流式对话

### POST /api/conversations/:id/chat/stream — SSE 流式回复

需要认证。响应类型 `text/event-stream`。

**请求体：**
```json
{
  "model": "deepseek-chat",
  "thinking": { "type": "enabled" }
}
```

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| model | string | 否 | 思考模式开启时 `deepseek-v4-pro`，否则 `deepseek-chat` | AI 模型名称 |
| thinking | object | 否 | — | 思考模式配置，`{ "type": "enabled" }` 开启深度思考 |

**SSE 事件格式：**

普通模式：
```
data: {"content":"你好","done":false,"type":"answer"}
data: {"content":"！","done":false,"type":"answer"}
data: {"content":"","done":true,"type":"answer"}
```

深度思考模式（thinking 先于 answer 输出）：
```
data: {"content":"用户问的是...","done":false,"type":"thinking"}
data: {"content":"根据推理...","done":false,"type":"thinking"}
data: {"content":"答案是...","done":false,"type":"answer"}
data: {"content":"！","done":false,"type":"answer"}
data: {"content":"","done":true,"type":"answer"}
```

| SSE 字段 | 类型 | 说明 |
|----------|------|------|
| content | string | 当前 chunk 的文本内容 |
| done | boolean | 是否流式结束 |
| type | string | `"thinking"` 思考过程 / `"answer"` 最终回答 |

**前端显示建议：**
- `type: "thinking"` 的内容放入折叠面板（标题如"深度思考中..."），流式实时更新
- `type: "answer"` 的内容直接渲染为回答正文
- 思考过程标记为已完成时，折叠面板可展开查看完整推理链

**错误事件：**
```
data: {"error":"错误信息"}
```

**中断生成：**
```
data: {"content":"","done":true,"aborted":true}
```

> 对话时后端自动加载历史消息中的 `files` 引用，处理文件内容并以多模态格式发送给 AI。

### POST /api/conversations/:id/chat/stop — 停止生成

需要认证。停止当前对话的流式生成。

**响应：**
```json
{ "success": true }
```
或
```json
{ "success": false, "message": "没有正在进行的流式对话" }
```

### POST /api/conversations/:id/chat/continue — 继续生成

需要认证。从上次中断处继续生成。

**请求体：**
```json
{
  "model": "deepseek-chat",
  "thinking": { "type": "enabled" }
}
```

参数同 `/chat/stream`。响应格式亦相同。

---

## 5. 文件上传

### POST /api/files/upload — 上传文件

需要认证。`Content-Type: multipart/form-data`，字段名 `file`。单次上传一个文件。

**响应 `201`：**
```json
{
  "fileId": "uuid",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "size": 12345
}
```

**大小限制：** 10MB（可通过环境变量 `MAX_FILE_SIZE` 调整）

### GET /api/files/:id — 查询文件元数据

需要认证。

**响应：**
```json
{
  "fileId": "uuid",
  "originalName": "report.pdf",
  "mimeType": "application/pdf",
  "size": 12345,
  "createdAt": 1700000000000
}
```

### 支持的文件类型

| 类别 | MIME 类型 | 处理方式 |
|------|----------|---------|
| 图片 | `image/png`, `image/jpeg`, `image/gif`, `image/webp` | base64 编码 → Vision API |
| PDF | `application/pdf` | 文本提取 |
| Word | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 文本提取 |
| 文本/代码 | `text/plain`, `text/markdown`, `text/html`, `text/css`, `text/javascript`, `application/json`, `application/xml` 及 `.js/.ts/.py` 等 | UTF-8 读取 |
| 其他 | — | 忽略 |

---

## 6. 公共

### GET /api/health — 健康检查

无需认证。

**响应：**
```json
{
  "status": "ok",
  "timestamp": 1700000000000
}
```

### POST /api/models/validate — 模型校验

无需认证。

**请求体：**
```json
{
  "model": "deepseek-chat"
}
```

---

## 附录

### 数据模型

| 表 | 字段 |
|----|------|
| users | `id`, `username`, `password_hash`, `created_at` |
| conversations | `id`, `user_id`, `title`, `model`, `created_at`, `updated_at` |
| messages | `id`, `conversation_id`, `role`, `content`, `timestamp`, `files` |
| uploaded_files | `id`, `user_id`, `original_name`, `mime_type`, `size`, `stored_path`, `extracted_text`, `created_at` |

### 文件处理流程

```
前端上传文件 → POST /api/files/upload (multipart)
  → 磁盘 data/files/{uuid}.ext  + 插入 uploaded_files 表
  → 返回 { fileId, originalName, mimeType, size }

前端保存消息 → POST /api/conversations/:id/messages
  → files 字段存 '["fileId1","fileId2"]'

前端触发对话 → POST /api/conversations/:id/chat/stream
  → buildMessages() 加载历史消息
  → 遍历 files → 查 uploaded_files → 图片 base64 编码 / 文档提取文本
  → 构建 OpenAI 多模态消息 → 调用 API → SSE 推送
```

### 游标分页

所有列表接口统一使用游标分页（cursor-based pagination）。

请求：`GET /api/conversations?cursor=1700000000000&limit=20`

响应：
```json
{
  "data": [...],
  "nextCursor": "1699000000000",
  "hasMore": true
}
```
