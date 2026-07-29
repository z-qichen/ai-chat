# AGENT.md — AI 编程规范

本项目遵循以下开发约定，AI 助手在生成/修改代码时必须遵守。

## 类型定义约束

- 类型定义统一放在 `src/types/`，按职责拆分：
  - `domain.ts` — 前端领域模型（Message、Conversation、SessionMeta、AppConfig 等）
  - `api.ts` — API 请求/响应类型（StreamChunk、AuthResponse 等）
  - `index.ts` — 统一 re-export，其余模块通过 `import type { ... } from '@/types'` 引入
- **严禁在 services/、stores/、components/ 中定义 interface/type**（仅允许文件内部私有的辅助类型）
- 新增类型必须追加到 `types/` 对应文件中，并在 `index.ts` 中导出

## 代码风格

- 路径别名 `@/` → `src/`
- 注释语言统一使用中文
- 组件使用 Vue 3 Composition API（`<script setup lang="ts">`）

## 技术栈

Vue 3 + TypeScript + Vite + Pinia + Element Plus + Vue Router
