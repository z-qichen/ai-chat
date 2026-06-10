# AGENT.md — AI 编程规范

本项目遵循以下开发约定，AI 助手在生成/修改代码时必须遵守。

## 代码风格

- 所有文件使用 ES Module (`"type": "module"`)
- 路径别名 `@/` → `src/`（已配置 tsconfig paths）
- 公共类型集中在 `src/types/index.ts`
- 路由层只做参数校验和响应，业务逻辑下沉到 `src/services/`
- 插件使用 `fastify-plugin` 包装，通过 `app.register()` 加载
- 数据库使用 better-sqlite3 同步 API，适合单进程开发场景
- JWT 认证通过 `onRequest` hook 注入，被保护路由统一调用 `authGuard`

## 注释规范

- 每个文件必须包含文件级 JSDoc 注释（说明职责、数据结构、核心流程）
- 关键函数需标注参数、返回值、用途
- 复杂逻辑需有行内注释
- 注释语言统一使用**中文**

## 安全规范

- 敏感信息（API Key、JWT Secret）一律通过环境变量注入，不硬编码
- 密码使用 Node.js 原生 `crypto.scryptSync` 哈希存储（16 字节盐 + 64 字节密钥，hex 编码格式 `salt:hash`），无需 bcrypt 等外部依赖
- 禁止引入暴露密钥、token 等敏感信息的代码

## 开发流程

- 开发前先理清流程，有疑问必须确认，不自行猜测
- 修改文件前理解已有代码风格，保持一致性
- 使用项目已有库和工具，不随意引入外部依赖
- 创建新组件时先参照已有组件的写法
- 完成开发后运行 lint 和 typecheck
- 不主动提交代码，除非用户明确要求

## 技术栈

Fastify 5 + TypeScript + better-sqlite3 + OpenAI SDK + JWT + Zod

## 项目结构

```
src/
├── index.ts                  # 入口：创建 Fastify 实例，注册插件与路由
├── config.ts                 # 环境变量配置
├── database.ts               # SQLite 连接 + 表结构初始化
├── types/index.ts            # 全局类型定义
├── plugins/                  # Fastify 插件（cors、jwt、rateLimit）
├── middlewares/auth.ts       # JWT 认证守卫
├── routes/                   # 路由层（auth、conversations、messages、chat、files、models）
└── services/                 # 业务逻辑层（user、conversation、message、deepseek、file、chat）
```
