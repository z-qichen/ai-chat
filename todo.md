# AI Chat 优化清单 & 学习方向

> 基于对项目的 Harness 工程 / 上下文工程 分析整理

---

## 一、即刻可做（低成本高收益，每项 ~1h）

### 1. Token 计数与上下文预算

- [ ] `buildMessages()` 中引入 `tiktoken` 估算 token 数量
- [ ] 超限时自动裁剪最早的消息（滑动窗口）
- [ ] 前端展示当前上下文用量（进度条/百分比）

### 2. 系统提示词配置化

- [ ] 前端 `config store` 中的 `systemPrompt` 字段接入后端
- [ ] 后端从数据库读取用户自定义系统提示词
- [ ] 支持简单变量替换（`{{user_name}}`、`{{date}}`）

### 3. API 重试与容错

- [ ] DeepSeek API 调用加 3 次指数退避重试（1s / 2s / 4s）
- [ ] 区分可重试错误（429/5xx）与不可重试错误（400/401）
- [ ] 后台记忆提取失败时写日志而非静默吞掉

### 4. 主对话支持工具调用

- [ ] 将 Tool Calling 从后台扩展到主对话流
- [ ] 实现基础 Agent Loop：LLM 返回 tool_calls → 执行工具 → 结果注入 → 再次调用
- [ ] 先加一个简单工具（计算器/当前时间）验证流程

---

## 二、短期目标（每项 ~半天）

### 5. 上下文管理升级

- [ ] 长对话自动摘要：超过 N 条消息时，将早期消息压缩为摘要
- [ ] 实现 Token 预算策略：系统提示词 20% + 记忆 10% + 历史 50% + 预留 20%
- [ ] 记忆存储改为 Embedding + 向量检索（当前是关键词匹配）

### 6. 可观测性基础

- [ ] 每次 LLM 调用记录：token 用量、延迟、模型、是否命中缓存
- [ ] 接入结构化日志（pino 或 winston）
- [ ] 前端展示每次请求的 token 消耗

### 7. 安全护栏（Guardrails）

- [ ] 输入侧：敏感词过滤、注入攻击检测
- [ ] 输出侧：内容安全检查、PII 脱敏
- [ ] 工具调用权限分级（只读/读写/管理员）

---

## 三、中期目标（每项 1~2 天）

### 8. Agent 循环正式化

- [ ] 将 Agent Loop 抽象为独立模块（`agent-runner.ts`）
- [ ] 支持多轮工具调用，设置最大迭代次数防止死循环
- [ ] 工具注册中心：支持插件式注册，运行时热加载
- [ ] SSE 流式推送 Agent 中间步骤（`type: 'tool_call'` / `type: 'tool_result'`）

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
