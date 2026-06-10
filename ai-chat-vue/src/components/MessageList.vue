<!--
  MessageList.vue —— 消息列表组件

  职责：
    - 以时间线形式展示当前会话的所有消息
    - 自动滚底（新消息到达时自动滚动到最底部）
    - 用户手动向上滚动时暂停自动滚底，向下滚到底时恢复

  自动滚底逻辑：
    1. 消息数量变化（新消息到来）→ 强制滚底
    2. 最后一条消息内容变化（流式追加）→ 条件滚底（用户未手动上滚时）
    3. 用户滚轮/键盘向上 → 暂停自动滚底
    4. 用户滚到底部 → 恢复自动滚底

  加载状态：当最后一条是 assistant 且 content 为空时，显示三点加载动画
-->
<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import MessageItem from './MessageItem.vue'

const chatStore = useConversationStore()

/** 消息列表 DOM 引用（用于滚动操作） */
const listRef = ref<HTMLDivElement | null>(null)

/** 当前会话的所有消息（已加载部分） */
const messages = computed(() => {
  return chatStore.currentMessages()
})

/** 是否还有更多历史消息可加载 */
const hasMore = computed(() => {
  return chatStore.hasMoreMessages()
})

/** 是否正在加载更多消息 */
const isLoadingMore = computed(() => {
  return chatStore.loadingMore
})

/** 是否正在等待 AI 回复（最后一条是空的 assistant 消息） */
const isLoading = computed(() => {
  const msgs = messages.value
  if (msgs.length === 0) return false
  const last = msgs[msgs.length - 1]
  return last.role === 'assistant' && last.content.length === 0
})

// ---- 自动滚底控制 ----

/** 用户是否手动向上滚动（此时暂停自动滚底） */
const isUserScrollingUp = ref(false)

/** 是否处于会话初始加载状态（切换历史对话时用于瞬时滚底） */
const isInitialLoad = ref(false)

/** 判断列表当前是否在底部（容差 50px） */
function isAtBottom(): boolean {
  const el = listRef.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 50
}

/** 滚动到列表底部（仅在用户未手动上滚时执行） */
function scrollToBottom() {
  if (isUserScrollingUp.value) return
  nextTick(() => {
    const el = listRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

/** 滚轮事件：向上滚动 → 暂停自动滚底，向下滚到底 → 恢复 */
function onWheel(e: WheelEvent) {
  if (e.deltaY < 0) {
    isUserScrollingUp.value = true
  } else if (e.deltaY > 0 && isAtBottom()) {
    isUserScrollingUp.value = false
  }
}

/** 键盘事件：ArrowUp → 暂停，ArrowDown → 滚到底时恢复 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') {
    isUserScrollingUp.value = true
  } else if (e.key === 'ArrowDown' && isAtBottom()) {
    isUserScrollingUp.value = false
  }
}

// ---- 向上翻页加载更多 ----

/** 是否正在执行加载更多（防重复触发） */
const isLoadingMoreTriggered = ref(false)

/** 滚动事件：检测是否滚动到顶部，触发加载更多 */
async function onScroll() {
  const el = listRef.value
  if (!el) return

  // 滚动到顶部附近（< 100px）且还有更多消息且未在加载中
  if (el.scrollTop < 100 && hasMore.value && !isLoadingMoreTriggered.value) {
    isLoadingMoreTriggered.value = true

    // 记录当前第一个可见消息，用于加载后恢复滚动位置
    const firstVisibleEl = el.querySelector('[data-message-id]') as HTMLElement | null
    const anchorId = firstVisibleEl?.getAttribute('data-message-id')

    await chatStore.loadMoreMessages(chatStore.currentId!)

    // 等待 DOM 更新后，将之前可见的消息拉回视野
    await nextTick()
    if (anchorId) {
      const anchorEl = el.querySelector(`[data-message-id="${anchorId}"]`) as HTMLElement | null
      if (anchorEl) {
        anchorEl.scrollIntoView({ block: 'start' })
      }
    }

    isLoadingMoreTriggered.value = false
  }
}

// 监听当前会话切换 → 标记为初始加载，用于瞬时滚底
watch(
  () => chatStore.currentId,
  () => {
    isInitialLoad.value = true
  }
)

// 监听消息数量变化 → 滚底（初始加载瞬时，新消息平滑）
watch(
  () => messages.value.length,
  () => {
    isUserScrollingUp.value = false
    nextTick(() => {
      const el = listRef.value
      if (el && messages.value.length > 0) {
        if (isInitialLoad.value) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
          isInitialLoad.value = false
        } else {
          el.scrollTop = el.scrollHeight
        }
      }
    })
  }
)

// 监听最后一条消息内容变化 → 条件滚底（流式打字机效果）
watch(
  () => {
    const msgs = messages.value
    if (msgs.length === 0) return ''
    const last = msgs[msgs.length - 1]
    return last.content
  },
  () => scrollToBottom()
)

// 组件挂载时：若消息已加载完毕（如刷新页面恢复会话），直接定位底部
onMounted(() => {
  if (messages.value.length > 0) {
    nextTick(() => {
      const el = listRef.value
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'instant' })
      }
    })
  } else if (chatStore.currentId && chatStore.loading) {
    // 消息正在异步加载中，标记为初始加载以便加载完成后瞬时滚底
    isInitialLoad.value = true
  }
})
</script>

<template>
  <div
    ref="listRef"
    class="message-list"
    tabindex="0"
    @wheel="onWheel"
    @keydown="onKeydown"
    @scroll="onScroll"
  >
    <div class="message-list__inner">
      <!-- 向上翻页加载指示器 -->
      <div v-if="hasMore" class="message-list__load-more">
        <span v-if="isLoadingMore" class="load-more-spinner" />
        <span v-else class="load-more-text">向上滚动加载更多</span>
      </div>

      <!-- 逐条渲染消息 -->
      <div v-for="msg in messages" :key="msg.id" :data-message-id="msg.id">
        <MessageItem :message="msg" />
      </div>

      <!-- 加载动画：AI 回复等待中显示三点跳动 -->
      <div v-if="isLoading" class="message-list__loading">
        <span class="loading-dot" />
        <span class="loading-dot" />
        <span class="loading-dot" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
/* 消息列表外层容器 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px;
  scroll-behavior: smooth;

  /* 内层：限制最大宽度，居中显示 */
  &__inner {
    max-width: 768px;
    margin: 0 auto;
    padding: 8px 0 24px;
  }

  /* 三点加载动画 */
  &__loading {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;

    .loading-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--loading-dot);
      animation: dotPulse 1.4s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  /* 向上翻页加载指示器 */
  &__load-more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
    color: var(--loading-dot);
    font-size: 12px;
  }
}

.load-more-text {
  color: var(--text-placeholder);
}

.load-more-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--spinner-border);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 三点跳动关键帧 */
@keyframes dotPulse {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
