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
| GET | `/api/health` | — | 健康检查 |

