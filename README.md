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

### Docker 部署

#### 准备

```bash
cp ai-chat-server/.env.example ai-chat-server/.env   # 编辑 .env 填入 DEEPSEEK_API_KEY
```

#### 方式一：docker compose（推荐）

```bash
docker compose up -d                                  # 一键构建并启动前后端
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d   # 生产环境（更严格的资源限制）
```

#### 方式二：分别构建镜像

```bash
# 后端
docker build -t ai-chat-server -f ai-chat-server/Dockerfile .
docker run -d --name ai-chat-backend --env-file ai-chat-server/.env -p 4000:4000 -v ./data:/app/data ai-chat-server

# 前端
docker build -t ai-chat-vue -f ai-chat-vue/Dockerfile .
docker run -d --name ai-chat-frontend -p 80:80 ai-chat-vue
```

#### 常用命令

```bash
docker compose down                                   # 停止并移除容器
docker compose up -d --build                          # 重新构建并启动
docker compose logs -f                                # 查看所有服务日志
docker compose logs -f backend                        # 仅查看后端日志
docker compose restart backend                        # 重启后端服务
```

启动后浏览器打开 `http://localhost` 即可使用。数据持久化在 `./data` 目录，容器删除重建不丢数据。

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

### 11. 多 Agent 场景协作（可视化剧情推演）

> 参照 AutoGen / CrewAI（多 Agent 对话协作）+ AI Town（可视化社交模拟）

在画布上创建角色（Agent），拖拽放置于场景中，Agent 根据角色设定、性格、记忆、技能自主对话，自动推动剧情发展。用户只需给定场景背景和大致故事方向。

#### 11.1 核心概念

| 概念 | 说明 |
|------|------|
| **场景（Scene）** | 一个带背景的可视化舞台（教室、办公室、咖啡馆…），承载所有角色 |
| **角色（SceneAgent）** | 场景中的一个 Agent 节点，拥有独立的人设、记忆和能力 |
| **个体记忆** | 每个 Agent 独立的对话上下文窗口，仅自己可见 |
| **共享记忆池** | 多个 Agent 之间共享的消息池，模拟"大家都知道的事" |
| **剧情方向** | 用户给定的故事大致走向和关键事件，Agent 在约束内自由发挥 |
| **推演循环** | 回合制调度引擎，每轮选取 2 个或多个 Agent 进行对话交互 |

#### 11.2 新增技术依赖

**前端新增：**
| 依赖 | 用途 |
|------|------|
| `@vue-flow/core` | 画布核心（节点拖拽、连线、缩放平移） |
| `@vue-flow/background` | 画布背景网格 / 自定义场景底图 |
| `@vue-flow/minimap` | 画布小地图导航 |
| `@vue-flow/controls` | 画布缩放控件 |

**后端新增（可选）：**
| 依赖 | 用途 |
|------|------|
| `chromadb` 或 `lancedb` | 长期记忆向量检索（轻量方案可暂用 SQLite + 关键词） |

#### 11.3 数据结构概要

```typescript
// 角色节点
interface SceneAgent {
  id: string
  name: string
  role: string              // 角色设定（老师、学生、老板、路人…）
  personality: string        // 性格描述（开朗、严肃、内向…）
  skills: string[]           // 技能列表（辩论、编程、书法…）
  goals: string[]            // 角色目标（当前场景中的个人目的）
  position: { x: number; y: number }   // 画布坐标
  avatar?: string            // 头像 URL
  individualMemory: Message[]           // 个体记忆
  sharedMemoryPoolIds: string[]         // 关联的共享记忆池
}

// 共享记忆池
interface SharedMemoryPool {
  id: string
  name: string               // 例如"教室公告栏"、"部门群聊"
  messages: Message[]        // 池中所有消息
  memberIds: string[]        // 能访问此池的 Agent ID
}

// 场景
interface Scene {
  id: string
  name: string
  background: string         // 背景图 URL 或 CSS 描述
  agents: SceneAgent[]
  initialEvent: string       // 初始事件描述（剧情起点）
  plotDirection: string      // 剧情大致方向
  targetOutcome?: string     // 目标结局（可选，不填则自由推演）
  status: 'idle' | 'running' | 'paused' | 'finished'
}
```

#### 11.4 架构

```
┌─ Vue 3 前端 ───────────────────────────────────────────┐
│  Vue Flow 画布（拖拽 Agent 节点、设置场景背景）          │
│  + Agent 属性面板（Element Plus Dialog / Drawer）       │
│  + 对话观察面板（SSE 实时流式气泡）                      │
│  + 场景管理面板（创建/编辑/启动/暂停场景）                │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket / SSE
┌─ Fastify 后端 ────┴─────────────────────────────────────┐
│  SceneController      场景 CRUD + 推演控制               │
│  SimulationLoop       回合制 Agent 对话调度器              │
│  AgentMemoryManager   个体记忆 + 共享记忆池管理            │
│  PlotDriver           剧情方向注入 + 关键事件触发          │
│  LLMService           调用 DeepSeek 生成 Agent 对话       │
│  LangGraph Swarm      复用现有 Swarm 集群（编排 → 并行对话） │
└──────────────────────────────────────────────────────────┘
```

#### 11.5 推演循环流程

```
1. 用户创建场景 → 放置 Agent → 设定剧情方向 → 点击"开始推演"
2. SimulationLoop 启动：
   a. 读取 initialEvent 作为首轮上下文
   b. 每轮选择 2 个 Agent（按关系/距离/随机策略）
   c. 注入角色设定 + 个体记忆 + 共享记忆 + 剧情方向到 Prompt
   d. LLM 生成对话（结构化输出：发言 Agent + 内容 + 内部状态变更）
   e. 对话写入各 Agent 个体记忆 + 共享记忆池
   f. 前端 SSE 推送对话，Agent 节点高亮 + 气泡显示
3. PlotDriver 检查是否触发关键事件（如"老师点名"）
4. 重复 b-f 直到达到回合上限或目标结局
```

#### 11.6 实施计划

- [ ] **11.6.1 画布基础** — 新建 `SceneCanvas.vue`（Vue Flow）
  - 画布渲染、背景设置（教室/办公室等预设底图）
  - 自定义 Agent 节点（头像 + 名称 + 状态指示器）
  - 缩放平移、小地图、控件

- [ ] **11.6.2 Agent 创建与编辑** — 新建 `AgentEditor.vue`
  - 双击画布创建 Agent / 右键菜单
  - 属性编辑面板：角色名、人设、性格、技能、目标
  - 拖拽移动 Agent 节点位置
  - 关联共享记忆池

- [ ] **11.6.3 场景管理** — 新建 `SceneManager.vue`
  - 场景列表（CRUD）
  - 场景配置：名称、背景图、初始事件、剧情方向
  - 启动 / 暂停 / 停止推演

- [ ] **11.6.4 共享记忆池管理** — 新建 `MemoryPoolManager.vue`
  - 创建/编辑/删除共享记忆池
  - 将 Agent 加入/移出记忆池
  - 查看池内消息历史

- [ ] **11.6.5 后端场景服务** — 数据库迁移 + `routes/scene.ts`
  - `scenes` 表、`scene_agents` 表、`shared_memory_pools` 表、`shared_memory_messages` 表
  - 场景 CRUD API（`POST/GET/PATCH/DELETE /api/scenes`）
  - Agent CRUD API（`POST/GET/PATCH/DELETE /api/scenes/:id/agents`）

- [ ] **11.6.6 推演引擎** — 新建 `services/simulation.ts`
  - `SimulationLoop` 回合制调度器
  - `AgentMemoryManager` 个体记忆 + 共享记忆管理
  - `PlotDriver` 剧情方向注入 + 关键事件触发器
  - `DialogueGenerator` LLM 调用生成 Agent 对话

- [ ] **11.6.7 实时对话推送** — WebSocket 路由 + 前端消费
  - WS endpoint: `/ws/scene/:sceneId` 推送对话事件
  - 事件类型：`agent_speak`（发言）、`agent_action`（行为）、`plot_event`（剧情事件）
  - 前端 Pinia Store 消费事件流，Agent 节点高亮 + 气泡动画

- [ ] **11.6.8 对话观察面板** — 新建 `DialoguePanel.vue`
  - 侧边 Panel 展示实时对话流（类似聊天窗口）
  - 发言者头像 + 角色名 + 气泡内容
  - 暂停时回看历史对话
  - 过滤单个 Agent 的对话视图

#### 依赖关系

```
11.6.1（画布）→ 11.6.2（Agent编辑）→ 11.6.3（场景管理）
                                              ↓
11.6.4（记忆池）                         11.6.5（后端服务）
                                              ↓
                                        11.6.6（推演引擎）
                                              ↓
                                   11.6.7（实时推送）
                                              ↓
                                   11.6.8（对话面板）
```

