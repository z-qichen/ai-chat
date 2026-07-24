# AI Chat

全栈 AI 对话应用 — Vue 3 前端 + Fastify 5 后端，对接 DeepSeek API，支持流式输出、Markdown 渲染、文件上传与多模态对话。

## 项目结构

```
ai-chat/
├── ai-chat-server/       # 后端服务 (Fastify 5 + TypeScript + SQLite)
├── ai-chat-vue/          # 前端应用 (Vue 3 + TypeScript + Vite + Element Plus)
├── package.json          # 根工作区配置
├── pnpm-workspace.yaml   # pnpm monorepo 配置
├── pnpm-lock.yaml
└── .gitignore
```

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + TypeScript + Vite + Pinia + Vue Router + Element Plus + Less |
| 后端 | Fastify 5 + TypeScript + better-sqlite3 + JWT + Zod |
| AI | DeepSeek API (OpenAI SDK 兼容) |
| 构建 | pnpm + pnpm workspace |

## 快速开始

### 环境准备

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cp ai-chat-server/.env.example ai-chat-server/.env   # 编辑 .env 填入 DeepSeek API Key 等配置
pnpm install
```

### 启动开发

```bash
pnpm dev
```

前后端同时启动：后端端口 4000，前端端口 3000。浏览器打开 `http://localhost:3000`，注册账号后即可使用。

## 功能

- 多轮对话 + SSE 流式输出 + 打字机效果
- Markdown 渲染 + 代码语法高亮
- 会话管理（新建 / 重命名 / 删除 / 搜索）
- 文件上传（图片 / PDF / Word / 代码），多模态对话
- 深度思考模式（deepseek-reasoner）
- 用户注册 / 登录（JWT 认证）
- 全局暗色 / 亮色主题
- 模型切换与校验
- 跨标签记忆：自动沉淀用户关键信息（身份/住址/喜好等），对话中智能注入

## API 概览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | — | 注册 |
| POST | `/api/auth/login` | — | 登录 |
| GET | `/api/conversations` | JWT | 会话列表（游标分页） |
| POST | `/api/conversations` | JWT | 创建会话 |
| PATCH | `/api/conversations/:id` | JWT | 更新会话 |
| DELETE | `/api/conversations/:id` | JWT | 删除会话 |
| GET | `/api/conversations/:id/messages` | JWT | 消息列表（游标分页） |
| POST | `/api/conversations/:id/messages` | JWT | 保存消息 |
| POST | `/api/conversations/:id/chat/stream` | JWT | SSE 流式对话 |
| POST | `/api/files/upload` | JWT | 文件上传 |
| GET | `/api/files/:id` | JWT | 文件元数据 |
| POST | `/api/models/validate` | — | 模型校验 |
| GET | `/api/memories` | JWT | 记忆列表 |
| POST | `/api/memories` | JWT | 新增记忆 |
| DELETE | `/api/memories/:id` | JWT | 删除记忆 |
| GET | `/api/health` | — | 健康检查 |

## 开发路线图

### 8. Agent 循环正式化

> 参照 Kimi（可见迭代）+ ChatGPT（可扩展工具生态）

- [ ] **8.1 工具注册中心** — 新建 `tool-registry.ts`
  - 插件式注册/注销：`register(tool)` / `unregister(name)`
  - 单例全局实例，支持按类别分组（system / user / knowledge）
  - `getDefinitions()` 转 OpenAI tools 格式
- [ ] **8.2 Agent 循环核心** — 新建 `agent-runner.ts`
  - 多轮迭代：`while tool_calls exist && iteration < maxIterations` 循环
  - 最大迭代次数 10，单轮超时 30s 防止死循环
  - 工具执行结果以 `role: 'tool'` 注入 messages 继续调用 LLM
- [ ] **8.3 SSE 流式推送中间步骤** — 修改 `chat.ts` 路由 + `types/index.ts`
  - 新增 `StreamChunk` 类型：`tool_call` / `tool_result`
  - 工具调用和结果在同一 SSE 连接中推送，无需重建连接
- [ ] **8.4 前端 Agent UI** — 新建 `ToolCallBubble.vue`
  - 工具执行中：旋转动画 + "正在调用 XXX..."
  - 工具完成：折叠卡片（展开可查看参数和结果）
  - 修改 `ChatInput.vue` 的 `consumeStream()` 分发 tool_call / tool_result
- [ ] **8.5 迁移现有工具**
  - 将 `memory.ts` 的 `extract_user_info` 注册到 ToolRegistry
  - 记忆提取从独立后台流程迁移为 Agent 循环的一部分

### 9. 模型路由与降级

> 参照 ChatGPT（智能路由）+ OpenRouter（降级链）

- [ ] **9.1 模型路由器** — 新建 `model-router.ts`
  - 三级模型分层：`fast`（flash/chat）→ `balanced`（chat/pro）→ `reasoning`（reasoner/pro）
  - `classify()` 根据消息长度、关键词、对话轮次判断任务复杂度
  - `select(tier)` 从层级中选最优可用模型
- [ ] **9.2 降级链配置** — 修改 `config.ts`
  - 每模型定义 fallback 链：`deepseek-chat → v4-flash → v4-pro`
  - `executeWithFallback()` 主模型失败时自动切换，仅限 rateLimit / unavailable 错误
- [ ] **9.3 会话偏好与预算** — 数据库迁移 + 前端设置页
  - `conversations` 表新增 `model_tier`（auto/fast/balanced/reasoning/manual）
  - `conversations` 表新增 `budget_limit` 和 `total_cost`
  - 模型选择器增加 "智能选择" 选项（默认选中）
- [ ] **9.4 成本追踪** — 修改 `deepseek.ts`
  - 从 API 响应提取 `usage.prompt_tokens` / `completion_tokens`
  - 按定价表计算费用，累加到会话 `total_cost`
  - 流式 done chunk 推送 usage 信息
- [ ] **9.5 前端模型信息展示**
  - 消息底部显示 "由 deepseek-chat 生成 · 约 $0.0023"
  - 设置页显示本月总消费，预算 90% 时弹提醒

### 10. RAG 知识库

> 参照 ChatGPT（分块 + 向量检索）

- [ ] **10.1 Embedding 服务** — 新建 `embedding.ts`
  - 使用 OpenAI 兼容 Embedding API（`text-embedding-3-small`，维度 1536）
  - `embedText()` / `embedBatch()` + `cosineSimilarity()`
- [ ] **10.2 文档分块** — 新建 `chunker.ts`
  - 参考 LangChain `RecursiveCharacterTextSplitter`
  - 块大小 800 字符（中文友好），重叠 150 字符
  - 分割优先级：段落 `\n\n` → 句子 `。` `.` → 分号 → 空格
- [ ] **10.3 向量存储** — 数据库迁移
  - 新建 `knowledge_files` 表（文件名/类型/状态/块数）
  - 新建 `knowledge_chunks` 表（文本 + embedding BLOB）
  - `Float32Array` → `Buffer` 序列化存储，检索时全量加载计算余弦相似度
- [ ] **10.4 知识库管理** — 新建 `knowledge-base.ts`
  - `ingestFile()` 上传→提取文本→分块→向量化→入库
  - `deleteKnowledge()` 级联删除所有 chunks
  - `listKnowledge()` 列出知识库文件及状态
- [ ] **10.5 语义检索** — 新建 `retrieval.ts`
  - `searchKnowledge(query, userId, topK=5, threshold=0.6)`
  - 用户最后一条消息作为查询，余弦相似度匹配 TopK
  - 相似度 < 0.6 的结果过滤掉
- [ ] **10.6 上下文注入** — 修改 `chat.ts` 的 `buildMessages()`
  - 检索结果格式化为知识块注入 system prompt 末尾
  - 附带来源文件名和相似度百分比
- [ ] **10.7 API 路由** — 新建 `routes/knowledge.ts`
  - `POST /api/knowledge/ingest` — 上传入库
  - `GET /api/knowledge/files` — 列出文件
  - `DELETE /api/knowledge/files/:id` — 移除文件
  - `POST /api/knowledge/search` — 测试检索（调试用）
- [ ] **10.8 前端知识库页面** — 新建 `KnowledgePage.vue`
  - 拖拽上传文档，文件列表（大小/状态/块数），删除，搜索测试

### 依赖关系

```
阶段一（Agent） 8.1 → 8.2 → 8.3 → 8.4 → 8.5
                 ↓ 无强依赖
阶段二（路由） 9.1 → 9.2 → 9.3 → 9.4 → 9.5
                 ↓ 无强依赖
阶段三（RAG） 10.1 → 10.2 → 10.3 → 10.4 → 10.5 → 10.6 → 10.7 → 10.8
```

三个阶段相对独立，建议按 8→9→10 顺序依次推进。

