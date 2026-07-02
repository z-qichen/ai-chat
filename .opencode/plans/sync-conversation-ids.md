# 会话 ID 同步改进计划

## 目标
解决"后端正常启动但前端报 '会话不存在'"的问题。采用主流 AI 对话产品的做法：前端即时创建会话（零延迟 UX），后端懒创建 + 启动同步保证一致性。

## 执行步骤

### 1. 修正 `api.ts` 会话 API（前端）
**文件：** `ai-chat-vue/src/services/api.ts`

- 修正 `getConversations()`：后端返回 `{ data: Conversation[], nextCursor, hasMore }`，需提取 `data` 数组并映射为 `SessionMeta[]`
- 修正 `createConversation()`：后端返回 `{ data: Conversation }`，需提取 `data` 并映射为 `SessionMeta`
- 更新顶部 JSDoc 注释（去掉过时的"后端尚未部署"描述）
- `updateConversation` / `deleteConversation` 返回类型保持 `Promise<void>`，增加静默容错

### 2. 后端 `conversations.ts`：GET /:id 自动创建
**文件：** `ai-chat-server/src/routes/conversations.ts`

- `GET /api/conversations/:id` 路由：会话不存在时自动调用 `createConversation()` 创建（与 messages 路由和 chat 路由行为一致）

### 3. 前端 `conversation.ts`：新增 `syncFromBackend()`
**文件：** `ai-chat-vue/src/stores/conversation.ts`

- 新增 `syncFromBackend()` 异步函数：调用 `getConversations()` 从后端拉取真实会话列表，调用 `replaceSessions()` 替换本地数据
- Store 初始化时调用：`hydrate()` 先恢复本地 → 如果有 token 则异步 `syncFromBackend()`
- 这样后端不可用时仍有 localStorage 兜底

### 4. 前端 `conversation.ts`：deleteSession / updateTitle 同步后端
**文件：** `ai-chat-vue/src/stores/conversation.ts`

- `deleteSession(id)`：先异步调 `deleteConversation(id)`（fire-and-forget），再本地删除
- `updateTitle(id, title)`：先本地乐观更新，再异步调 `updateConversation(id, title)`（fire-and-forget）
- `createSession()`：保持当前逻辑不变（本地即时创建，首条消息时后端自动创建）

### 5. 清理重复文件
**文件：** `ai-chat-vue/src/stores/conversation.js`

- 确认无引用后删除（与 `.ts` 版本重复）

### 6. 验证
- 运行 `npm run typecheck` 和 `npm run lint`（前端）
- 检查后端编译
