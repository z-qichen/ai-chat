<!--
  ChatPage.vue —— 应用布局壳

  结构：
    - 左侧：可折叠侧边栏（Sidebar），始终保留，显示会话列表
    - 右侧：<router-view />，根据子路由动态切换内容：
        /              → ChatArea（新对话 / 空态）
        /chat/:id      → ChatArea（指定会话）
        /task          → TaskPage（定时任务）
        /plugins       → PluginsPage（插件）
        /memory        → MemoryPage（档案管理）

  布局：flex 横向排列，侧边栏通过动画切换显隐（宽度 300px ↔ 0）
  路由策略：会话操作（新建/切换/删除）同步驱动路由变化，路由变化也反向同步 store
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import { useConversationStore } from '@/stores/conversation'

/** 768px 移动端断点 */
const MOBILE_BREAKPOINT = 768

/** 会话 Store 实例 */
const store = useConversationStore()
const router = useRouter()
const route = useRoute()

/** 侧边栏是否可见，桌面端默认展开，移动端默认隐藏 */
const isSidebarVisible = ref(true)

/** 初始设置：移动端默认折叠 */
function initSidebarState() {
  isSidebarVisible.value = window.innerWidth >= MOBILE_BREAKPOINT
}

onMounted(async () => {
  initSidebarState()
  await store.syncFromBackend()
  window.addEventListener('resize', initSidebarState)
  // 同步完成后若已有当前会话且 URL 不是会话路由，跳转到对应会话
  if (store.currentId && route.name !== 'chat-session') {
    router.replace({ name: 'chat-session', params: { id: store.currentId } })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', initSidebarState)
})

/** 传给 Sidebar 的会话列表（仅含 id + title，不含消息） */
const sidebarSessions = computed(() =>
  store.sessions.map((s) => ({ id: s.id, title: s.title, fromTaskId: s.fromTaskId }))
)

/** 切换侧边栏展开/折叠状态 */
const onToggleSidebar = () => {
  isSidebarVisible.value = !isSidebarVisible.value
}

/** 新建会话（点击侧边栏"新建"按钮时） */
const onNewChat = () => {
  store.createSession()
  router.push({ name: 'chat-session', params: { id: store.currentId } })
}

/** 选中侧边栏某个会话 */
const onSelectSession = (id: string) => {
  store.selectSession(id)
  router.push({ name: 'chat-session', params: { id } })
}

/** 编辑会话标题（侧边栏内联编辑确认后） */
const onUpdateTitle = (id: string, title: string) => {
  store.updateTitle(id, title)
}

/** 删除会话（侧边栏确认删除后） */
const onDeleteSession = (id: string) => {
  store.deleteSession(id)
  if (store.currentId) {
    router.push({ name: 'chat-session', params: { id: store.currentId } })
  } else {
    router.push({ name: 'chat-new' })
  }
}

/** 向子路由组件注入侧边栏状态与方法 */
provide('sidebarVisible', isSidebarVisible)
provide('toggleSidebar', onToggleSidebar)

/** 监听路由参数变化：直接 URL 导航（书签/前进后退）时同步 store 中的当前会话 */
watch(
  () => route.params.id,
  (id) => {
    if (id && id !== store.currentId) {
      store.selectSession(id as string)
    }
  }
)
</script>

<template>
  <div class="chat-page">
    <!-- 侧边栏区域：通过 --hidden 修饰符控制宽度动画（桌面端）/ 滑入动画（移动端） -->
    <div :class="['chat-page__sidebar', { 'chat-page__sidebar--hidden': !isSidebarVisible }]">
      <Sidebar
        :sessions="sidebarSessions"
        :active-id="store.currentId"
        @toggle-sidebar="onToggleSidebar"
        @new-chat="onNewChat"
        @select-session="onSelectSession"
        @update-title="onUpdateTitle"
        @delete-session="onDeleteSession"
        @load-more-sessions="store.loadMoreSessions"
      />
    </div>

    <!-- 移动端抽屉遮罩层 -->
    <div class="chat-page__backdrop" @click="onToggleSidebar"></div>

    <!-- 右侧内容区：根据子路由动态切换 -->
    <div class="chat-page__main">
      <!-- 侧边栏折叠时显示展开按钮（所有子路由页面共用） -->
      <button v-if="!isSidebarVisible" class="chat-page__expand-btn" @click="onToggleSidebar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      </button>
      <router-view />
    </div>
  </div>
</template>

<style scoped lang="less">
.chat-page {
  display: flex;
  height: 100vh;
  overflow: hidden;
  border-radius: 16px;
  background-color: var(--bg-chat);

  /* 侧边栏容器 */
  &__sidebar {
    width: 300px;
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
    transition: width 0.3s ease;

    /* 折叠状态：宽度为0 */
    &--hidden {
      width: 0;
    }
  }

  /* 主区域：flex: 1 自动占满剩余空间 */
  &__main {
    flex: 1;
    min-width: 0;
    position: relative;
  }

  /* 侧边栏展开按钮（全局，侧边栏折叠时浮在内容区左上角） */
  &__expand-btn {
    position: absolute;
    z-index: 10;
    top: 1rem;
    left: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    color: var(--text-placeholder);
    cursor: pointer;
    transition: all 0.15s;
    background: transparent;
    border: none;
    padding: 0;

    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-secondary);
    }
  }

  /* 移动端抽屉遮罩层：桌面端隐藏 */
  &__backdrop {
    display: none;
  }
}

/* ---- 移动端 (≤768px) 布局 ---- */
@media (max-width: 768px) {
  .chat-page {
    border-radius: 0;
  }

  .chat-page__sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 300px;
    z-index: 50;
    flex: none;
    transition: transform 0.3s ease;
    transform: translateX(-100%);
    box-shadow: none;
  }

  /* 展开状态：无 --hidden 类时滑入 */
  .chat-page__sidebar:not(.chat-page__sidebar--hidden) {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  }

  .chat-page__backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 45;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }

  .chat-page__sidebar:not(.chat-page__sidebar--hidden) ~ .chat-page__backdrop {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
