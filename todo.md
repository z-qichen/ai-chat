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
