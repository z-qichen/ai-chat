# AI Chat

基于 Vue 3 的 AI 对话 Web 应用，对接 DeepSeek API，支持流式输出与 Markdown 渲染。

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Less + Element Plus + markdown-it + highlight.js

## 快速开始

```bash
pnpm install
pnpm run dev       # 启动开发服务器 → http://localhost:3000
pnpm run build     # 生产构建
npx vue-tsc --noEmit  # 类型检查
```
## github仓库地址 git@github.com:z-qichen/ai-chat.git

## 项目状态 (2026-06-09)

### 已完成
- [x] 项目脚手架 (Vite + Vue 3 + TS + Less + Element Plus)
- [x] 路由配置 (`/` ChatPage, `/settings` SettingsPage, `/login` LoginPage, `/:pathMatch(.*)*` 404)
- [x] Pinia Store — `auth` (用户认证) + `config` (应用配置) + `conversation` (会话与消息)
- [x] 类型定义 (Message / Conversation / AppConfig / StreamChunk / AttachedFile / User / AuthResponse)
- [x] 全局样式 (CSS Reset + 滚动条美化)
- [x] `services/api.ts` — 后端 REST API 客户端 (Fastify.js，含认证、会话 CRUD、消息分页、SSE 流式)
- [x] `services/chat.ts` — DeepSeek API 直连 (普通请求 + SSE 流式请求)
- [x] `pages/ChatPage.vue` — 对话页面 (侧边栏 + 主区域，支持折叠切换)
- [x] `pages/LoginPage.vue` — 登录/注册页面 (JWT 认证，含表单校验)
- [x] `pages/NotFoundPage.vue` — 404 页面 (暗色模式 + 返回首页)
- [x] `components/Sidebar.vue` — 侧边栏 (虚拟滚动会话列表 + 新建/编辑/删除 + 退出登录)
- [x] `components/ChatArea.vue` — 聊天主区域布局 (空态居中 / 有消息时上移)
- [x] `components/MessageList.vue` — 消息列表 (自动滚底 + 向上翻页加载历史)
- [x] `components/MessageItem.vue` — 单条消息气泡 (user/assistant 区分 + 附件预览)
- [x] `components/ChatInput.vue` — 输入框 (自动伸缩 + 文件上传 + Enter 发送 + 深度思考开关)
- [x] `components/ModelSelector.vue` — 模型选择器 (下拉切换 + 后端校验 + 错误提示 + 建议引导)
- [x] `components/MarkdownRenderer.vue` — Markdown 渲染 (14 种语言语法高亮)
- [x] 流式输出 + 打字机效果
- [x] 文件附件上传与预览 (图片 + 文档)
- [x] 深度思考模式 (切换到 deepseek-reasoner 模型)
- [x] 会话持久化 (localStorage 侧边栏元数据 + 消息按需加载)
- [x] 用户认证 (登录/注册/JWT Token 路由守卫)
- [x] 模型校验接口 (`POST /api/models/validate`)
- [x] 生产构建 (`dist/`)
- [x] **全局暗色模式** (CSS 变量 + Pinia Store + localStorage 持久化 + Element Plus 适配 + highlight.js 主题切换)

### 待完成
- [ ] `pages/SettingsPage.vue` — API 配置页面 (目前为占位)
- [ ] `utils/stream.ts` — SSE 流式工具抽离 (当前逻辑在 services/chat.ts 内)
- [ ] **后端 API (Fastify.js)** — 会话 CRUD + 消息游标分页 + SSE 流式回复 + 模型校验
- [ ] "停止生成" 按钮 (AbortController 已在 service 支持，UI 未接入)
- [ ] "联网搜索" 功能 (按钮已绘制，未接线)
- [ ] 全局暗色模式
- [ ] 移动端适配
- [ ] 单元测试

## 目录结构

```
src/
├── main.ts                     # 入口
├── App.vue                     # 根组件
├── style.less                  # 全局样式
├── types/
│   └── index.ts                # 类型定义
├── router/
│   └── index.ts                # 路由配置 (懒加载 + 认证守卫)
├── stores/
│   ├── auth.ts                 # 认证 Store (JWT 登录/注册)
│   ├── chat.ts                 # 旧版会话 Store (未使用)
│   ├── config.ts               # 配置 Store (API Key / 模型 / 提示词)
│   └── conversation.ts         # 会话与消息 Store (分页加载 + 本地持久化)
├── services/
│   ├── api.ts                  # 后端 REST API (认证/会话/消息/模型校验)
│   └── chat.ts                 # DeepSeek API 直连 (chat + chatStream)
├── pages/
│   ├── ChatPage.vue            # 对话页面
│   ├── LoginPage.vue           # 登录/注册页面
│   ├── SettingsPage.vue        # 设置页面 (占位)
│   └── NotFoundPage.vue        # 404 页面 (暗色模式)
├── components/
│   ├── Sidebar.vue             # 侧边栏 (虚拟滚动)
│   ├── ChatArea.vue            # 聊天主区域布局
│   ├── MessageList.vue         # 消息列表 (自动滚底 + 翻页)
│   ├── MessageItem.vue         # 消息气泡渲染
│   ├── ChatInput.vue           # 输入框 + 发送 + 深度思考
│   ├── MarkdownRenderer.vue    # Markdown + 代码高亮
│   └── ModelSelector.vue       # 模型选择器 (校验 + 错误提示)
└── utils/
    └── stream.ts               # 流式工具 (空文件，待实现)
```

## API 接口说明

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 否 | 用户登录 |
| POST | `/api/auth/register` | 否 | 用户注册 |
| GET | `/api/conversations` | 是 | 获取会话列表 |
| POST | `/api/conversations` | 是 | 创建会话 |
| PATCH | `/api/conversations/:id` | 是 | 更新会话标题 |
| DELETE | `/api/conversations/:id` | 是 | 删除会话 |
| GET | `/api/conversations/:id/messages` | 是 | 分页获取消息 |
| POST | `/api/conversations/:id/messages` | 是 | 新增消息 |
| POST | `/api/conversations/:id/chat/stream` | 是 | SSE 流式 AI 回复 |
| POST | `/api/models/validate` | 否 | 校验模型名称是否可用 |

## 架构约定

- 所有组件使用 `<script setup lang="ts">`
- Pinia Store 使用 Setup Store 风格 (`defineStore('name', () => {...})`)
- 路由懒加载 (`() => import(...)`)
- 路径别名 `@/` → `src/`
- 公共类型集中在 `src/types/index.ts`
- 组件样式写在各自 `.vue` 文件内 (`<style scoped lang="less">`)；`src/style.less` 仅放全局公共样式
- **代码注释**：每个文件必须包含文件级 JSDoc 注释（说明职责、数据结构、核心流程），关键函数需标注参数/返回值/用途，复杂逻辑需有行内注释。注释语言统一使用中文
