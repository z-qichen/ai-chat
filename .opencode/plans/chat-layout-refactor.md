# ChatPage 布局化改造方案

## 目标
ChatPage 作为布局壳，侧边栏始终保留，右侧根据路由切换不同内容。

## 改动清单（4个文件）

### 1. `src/router/index.ts` — 路由嵌套化

**改动前：**
```ts
{ path: '/', name: 'chat', component: ChatPage },
{ path: '/task', ... },
{ path: '/plugins', ... },
{ path: '/memory', ... },
```

**改动后：**
```ts
{
  path: '/',
  component: () => import('@/pages/ChatPage.vue'),
  meta: { requiresAuth: true },
  children: [
    { path: '',        name: 'chat',    component: () => import('@/components/ChatArea.vue') },
    { path: 'task',    name: 'task',    component: () => import('@/pages/TaskPage.vue') },
    { path: 'plugins', name: 'plugins', component: () => import('@/pages/PluginsPage.vue') },
    { path: 'memory',  name: 'memory',  component: () => import('@/pages/MemoryPage.vue') },
  ],
},
// /settings、/login、/:pathMatch(.*)* 保持独立不变
```

> 父路由的 `meta.requiresAuth` 在 Vue Router 4 中自动合并到子路由 `to.meta`，路由守卫无需改动。

---

### 2. `src/pages/ChatPage.vue` — 布局化

**改动点：**
- `<script setup>` 中：
  - 添加 `import { provide }` 
  - 移除 `import ChatArea`
  - 添加 provide：
    ```ts
    provide('sidebarVisible', isSidebarVisible)
    provide('toggleSidebar', onToggleSidebar)
    ```
- `<template>` 中：
  - `<ChatArea :sidebar-visible="..." @toggle-sidebar="..." />` 
  - 替换为 `<router-view />`

---

### 3. `src/components/ChatArea.vue` — 改用 inject

**改动点：**
- `<script setup>` 中：
  - 添加 `import { inject, type Ref } from 'vue'`
  - 删除 `defineProps<{ sidebarVisible: boolean }>()`
  - 删除 `const emit = defineEmits<{ 'toggle-sidebar': [] }>()`
  - 添加：
    ```ts
    const sidebarVisible = inject<Ref<boolean>>('sidebarVisible')!
    const toggleSidebar = inject<() => void>('toggleSidebar')!
    ```
- `<template>` 中：
  - `!sidebarVisible` → `!sidebarVisible.value`（因为是 Ref）
  - `emit('toggle-sidebar')` → `toggleSidebar()`

---

### 4. `src/components/Sidebar.vue` — 无需改动

`router.push('/task')`、`router.push('/plugins')`、`router.push('/memory')` URL 不变，Vue Router 自动匹配到 ChatPage 的子路由。

---

## 验证步骤
1. `pnpm --filter ai-chat-vue run typecheck` 或 `vue-tsc --noEmit`
2. 启动 `pnpm dev`，手动验证：
   - 点击侧边栏「定时任务」→ 右侧面板切换为 TaskPage 内容，侧边栏不消失
   - 点击侧边栏「插件」→ 右侧面板切换为 PluginsPage 内容
   - 点击「用户档案」→ 右侧面板切换为 MemoryPage 内容
   - 点击新建会话 → 回到 ChatArea 聊天界面
   - 侧边栏折叠/展开功能正常
