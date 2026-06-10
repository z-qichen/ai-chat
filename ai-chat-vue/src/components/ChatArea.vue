<!--
  ChatArea.vue —— 聊天主区域布局组件

  职责：
    - 顶部栏：侧边栏折叠时显示展开按钮 + 模型选择器
    - 中间：消息列表（MessageList），无消息时垂直居中，有消息时上移
    - 底部：消息输入框（ChatInput），固定不随列表滚动

  数据流向：
    - 从 chatStore 读取当前会话的消息列表判断是否有消息
    - 通过 `hasMessages` 切换 empty / has-content 两种布局模式
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'
import ModelSelector from './ModelSelector.vue'

/** 父组件传入的侧边栏可见状态 */
defineProps<{ sidebarVisible: boolean }>()

/** 对外通知：请求切换侧边栏 */
const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const chatStore = useConversationStore()

/** 当前会话是否有消息（决定空态/有消息布局） */
const hasMessages = computed(() => {
  return chatStore.currentMessages().length > 0
})
</script>

<template>
  <div class="chat-area">
    <!-- 顶部导航栏 -->
    <div class="chat-area__top">
      <!-- 侧边栏折叠时才显示展开按钮 -->
      <button v-if="!sidebarVisible" class="chat-area__toggle-btn" @click="emit('toggle-sidebar')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
        </svg>
      </button>
      <ModelSelector />
    </div>

    <!-- 内容区域：根据是否有消息切换居中/靠上布局 -->
    <div class="chat-area__body" :class="{ 'chat-area__body--center': !hasMessages }">
      <!-- 消息列表：有消息时 flex:1 填满空间并启用滚动 -->
      <MessageList :class="{ 'message-list--grow': hasMessages }" />
      <!-- 输入框始终固定在底部 -->
      <ChatInput :has-messages="hasMessages" />
    </div>
  </div>
</template>

<style scoped lang="less">
.chat-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

/* 顶部栏 */
.chat-area__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 16px 16px 12px;
  background: var(--bg-primary);
}

/* 侧边栏展开按钮（仅在折叠时显示） */
.chat-area__toggle-btn {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--text-placeholder);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-secondary);
  }
}

/* 内容主体 */
.chat-area__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* 空态：垂直居中显示欢迎界面 */
  &--center {
    justify-content: center;
  }
}

/* 有消息时：消息列表占满空间并可滚动 */
.message-list--grow {
  flex: 1;
  overflow-y: auto;
}
</style>
