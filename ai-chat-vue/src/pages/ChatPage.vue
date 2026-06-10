<!--
  ChatPage.vue —— 对话主页面

  结构：
    - 左侧：可折叠侧边栏（Sidebar），显示会话列表
    - 右侧：聊天主区域（ChatArea），包含消息列表 + 输入框

  布局：flex 横向排列，侧边栏通过动画切换显隐（宽度 300px ↔ 0）
  通信方式：父组件通过 props 向下传递数据，子组件通过 emit 向上通知事件
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import ChatArea from '@/components/ChatArea.vue'
import { useConversationStore } from '@/stores/conversation'

/** 会话 Store 实例 */
const store = useConversationStore()

/** 侧边栏是否可见，true=展开（默认），false=折叠 */
const isSidebarVisible = ref(true)

/** 传给 Sidebar 的会话列表（仅含 id + title，不含消息） */
const sidebarSessions = computed(() =>
  store.sessions.map((s) => ({ id: s.id, title: s.title }))
)

/** 切换侧边栏展开/折叠状态 */
const onToggleSidebar = () => {
  isSidebarVisible.value = !isSidebarVisible.value
}

/** 新建会话（点击侧边栏"新建"按钮时） */
const onNewChat = () => {
  store.createSession()
}

/** 选中侧边栏某个会话 */
const onSelectSession = (id: string) => {
  store.selectSession(id)
}

/** 编辑会话标题（侧边栏内联编辑确认后） */
const onUpdateTitle = (id: string, title: string) => {
  store.updateTitle(id, title)
}

/** 删除会话（侧边栏确认删除后） */
const onDeleteSession = (id: string) => {
  store.deleteSession(id)
}
</script>

<template>
  <div class="chat-page">
    <!-- 侧边栏区域：通过 --hidden 修饰符控制宽度动画 -->
    <div :class="['chat-page__sidebar', { 'chat-page__sidebar--hidden': !isSidebarVisible }]">
      <Sidebar
        :sessions="sidebarSessions"
        :active-id="store.currentId"
        @toggle-sidebar="onToggleSidebar"
        @new-chat="onNewChat"
        @select-session="onSelectSession"
        @update-title="onUpdateTitle"
        @delete-session="onDeleteSession"
      />
    </div>

    <!-- 主聊天区域 -->
    <div class="chat-page__main">
      <ChatArea :sidebar-visible="isSidebarVisible" @toggle-sidebar="onToggleSidebar" />
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
    transition: width 0.3s ease; // 折叠动画

    /* 折叠状态：宽度为0 */
    &--hidden {
      width: 0;
    }
  }

  /* 主区域：flex: 1 自动占满剩余空间 */
  &__main {
    flex: 1;
  }
}
</style>
