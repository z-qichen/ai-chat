# AI Chat 优化清单 & 学习方向

> 基于对项目的 Harness 工程 / 上下文工程 分析整理

---

## 上线清单

### 准备

- [ ] 购买一台 Linux 服务器（最低 1核2G，推荐阿里云/腾讯云轻量应用服务器）
- [ ] 准备一个域名，DNS 解析 A 记录到服务器 IP
- [ ] 服务器安装 Docker：`curl -fsSL https://get.docker.com | bash`
- [ ] 获取 DeepSeek API Key：[platform.deepseek.com](https://platform.deepseek.com) → API Keys
- [ ] GitHub 仓库 Settings → Secrets → Actions 配置 4 个密钥：

| Secret 名 | 说明 |
|-----------|------|
| `DEPLOY_HOST` | 服务器 IP |
| `DEPLOY_USER` | SSH 用户名（通常 root） |
| `DEPLOY_SSH_KEY` | 服务器 SSH 私钥 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |

### 部署

```bash
# SSH 到服务器，执行：
git clone https://github.com/z-qichen/ai-chat.git /opt/ai-chat
cd /opt/ai-chat

# 创建后端环境变量
cp ai-chat-server/.env.example ai-chat-server/.env
# 编辑 ai-chat-server/.env，填入 DEEPSEEK_API_KEY 和 JWT_SECRET

# 设置域名
echo "DOMAIN=你的域名.com" > .env

# 启动
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 自动部署流程

```
本地开发 → git commit → git push main
    │
    ▼
GitHub Actions 自动触发
    │
    ├─ lint 检查
    ├─ 构建 Docker 镜像（前后端）
    ├─ 推送到 ghcr.io
    ├─ SSH 到服务器
    ├─ docker compose pull（拉新镜像）
    ├─ docker compose up -d（重启）
    │
    ▼
  上线完成 ✅
```

> JWT_SECRET 首次自动生成，后续部署复用已有值，用户不会每次被踢下线。

### 已修复的上线问题

- [x] `Dockerfile` 中 `pnpm deploy --legacy` 移除（pnpm v10 已废弃该参数）
- [x] CI/CD 中 JWT_SECRET 每次部署重新生成 → 改为首次生成后续复用

---

## 〇、后端规范化（优先，对齐标准请求流程）

### 0.1 全局错误处理

- [x] `index.ts` 注册 `app.setErrorHandler`，兜底所有未捕获异常
- [x] 区分错误类型：Zod 校验错误 → 400、业务错误 → 对应状态码、其余 → 500
- [x] 自定义 `AppError` 类（含 `code` / `statusCode` / `message`），Service 层抛出
- [x] 注册 `app.setNotFoundHandler`，统一 404 响应格式
- [x] 错误统一走响应格式，避免泄露堆栈到前端

### 0.2 统一响应格式

- [x] 定义统一结构 `{ code, message, data }`
- [x] 封装 `success(data, message?)` / `fail(code, message)` 辅助函数
- [x] 各路由改用统一格式（`conversations` / `auth` / `messages` / `chat` / `files` / `memory` / `models`）
- [x] 前端 API 层同步适配新响应结构

### 0.3 参数校验补全

- [x] 为路径参数 `:id` 增加 Zod 校验（UUID 格式）
- [x] 抽取通用 `idParamSchema`，覆盖所有含 `:id` 的路由
- [x] 统一校验失败响应走全局错误处理（配合 0.1）

### 0.4 流式 tool_calls 排序修复（`deepseek.ts`）

- [ ] 问题：`StreamAccumulator.toolCalls` 的 entry 未保存 `index`，流结束后按 `name`/`id` 字母序排序（`deepseek.ts:207`），多工具并行时最终顺序与模型意图顺序不一致
- [ ] 修复：Map 的 value 结构中加入 `index` 字段，累积时一并写入（`deepseek.ts:169`）
- [ ] 修复：结束后改为按 `index` 升序排序（`a.index - b.index`），移除 name/id 排序
- [ ] 说明：按 index 累积拼接的逻辑本身正确，不会串台，此项仅修正顺序丢失
- [ ] 可选：`toolCallMode` 采用互斥模式（进入工具模式后 content 只累积不推送），若需边推文字边调工具需改为双累积线

---

## 一、即刻可做（低成本高收益，每项 ~1h）

### 1. Token 计数与上下文预算

- [x] `buildMessages()` 中引入 `tiktoken` 估算 token 数量
- [x] 超限时自动裁剪最早的消息（滑动窗口）
- [x] 前端展示当前上下文用量（进度条/百分比）

### 2. 系统提示词配置化

- [x] 前端 `config store` 中的 `systemPrompt` 字段接入后端
- [x] 后端从数据库读取用户自定义系统提示词
- [x] 支持简单变量替换（`{{user_name}}`、`{{date}}`）

### 3. API 重试与容错

- [x] DeepSeek API 调用加 3 次指数退避重试（1s / 2s / 4s）
- [x] 区分可重试错误（429/5xx）与不可重试错误（400/401）
- [ ] 后台记忆提取失败时写日志而非静默吞掉

### 4. 主对话支持工具调用

- [x] 将 Tool Calling 从后台扩展到主对话流
- [x] 实现基础 Agent Loop：LLM 返回 tool_calls → 执行工具 → 结果注入 → 再次调用
- [x] 先加一个简单工具（计算器/当前时间）验证流程

---

## 二、短期目标（每项 ~半天）

### 5. 上下文管理升级

- [ ] 长对话自动摘要：超过 N 条消息时，将早期消息压缩为摘要
- [ ] 实现 Token 预算策略：系统提示词 20% + 记忆 10% + 历史 50% + 预留 20%
- [ ] 记忆存储改为 Embedding + 向量检索（当前是关键词匹配）

### 6. 可观测性基础

- [ ] 每次 LLM 调用记录：token 用量、延迟、模型、是否命中缓存
- [x] 接入结构化日志（pino 或 winston）
- [ ] 前端展示每次请求的 token 消耗

### 7. 安全护栏（Guardrails）

- [ ] 输入侧：敏感词过滤、注入攻击检测
- [ ] 输出侧：内容安全检查、PII 脱敏
- [ ] 工具调用权限分级（只读/读写/管理员）

---

## 三、中期目标（每项 1~2 天）

### 8. Agent 循环正式化

- [ ] 将 Agent Loop 抽象为独立模块（`agent-runner.ts`）
- [x] 支持多轮工具调用，设置最大迭代次数防止死循环
- [ ] 工具注册中心：支持插件式注册，运行时热加载
- [x] SSE 流式推送 Agent 中间步骤（`type: 'tool_call'` / `type: 'tool_result'`）

### 9. 模型路由与降级

- [ ] 按任务复杂度路由到不同模型（简单问答用 flash，复杂推理用 pro）
- [ ] 主模型不可用时自动 fallback 到备用模型
- [ ] 用户可设置每会话的模型偏好和预算上限

### 10. RAG 知识库

- [ ] 用户可上传文档建立个人知识库
- [ ] 向量化存储（嵌入模型 + 向量数据库）
- [ ] 对话时自动检索相关知识片段注入上下文

---

## 四、长期方向（架构演进）

### 11. MCP 协议集成

- [ ] 实现 MCP Client，接入社区工具生态（文件系统、数据库、浏览器等）
- [ ] 支持 MCP Server，让外部 Agent 也能调用本系统的能力
- [ ] 工具权限沙箱隔离

### 12. 多 Agent 协作

- [ ] 子任务分发：复杂任务拆解分发给专精 Agent
- [ ] Agent 间通信：共享上下文与中间结果
- [ ] 人在回路（Human-in-the-loop）：关键操作需用户确认

### 13. 提示词工程体系

- [ ] 提示词版本管理与 A/B 测试框架
- [ ] 提示词模板库（角色扮演、代码审查、文档生成等场景模板）
- [ ] 提示词性能评估（准确率、用户满意度、token 效率）

---

## 五、学习方向建议

### 必读论文 / 博客

| 内容 | 关联模块 |
|------|----------|
| ReAct Pattern (Yao et al., 2022) | Agent Loop |
| Anthropic 的 Prompt Caching 文档 | 上下文预算 |
| OpenAI Function Calling 最佳实践 | 工具编排 |
| MCP 协议规范 (modelcontextprotocol.io) | 工具生态 |
| LangChain / Vercel AI SDK 源码 | Harness 设计参考 |
| Building Effective Agents (Anthropic, 2024.12) | Agent 架构设计原则 |

### 面试话术要点

1. **Harness 是什么**：LLM 与应用之间的编排中间层，管理 Agent 循环、工具调用、上下文组装、可观测性
2. **核心模块**：Context Builder → LLM Wrapper → Tool Executor → Agent Loop → Guard → Router
3. **关键取舍**：流式体验 vs 工具调用延迟、上下文长度 vs 质量 vs 成本、工具权限 vs 安全性
4. **你的实践**：用 DeepSeek + OpenAI SDK 搭建了一个带异步记忆的聊天 Harness，正向 Agent Loop 和工具编排演进

---

## 六、开发路线图（自 README 迁入）

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

#### 依赖关系

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
