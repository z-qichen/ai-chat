<!--
  MessageItem.vue —— 单条消息气泡组件

  职责：
    - 根据消息 role（user / assistant）渲染不同样式的气泡
    - user 消息靠右，浅灰背景带边框
    - assistant 消息靠左，无背景（透明）
    - 若有附件文件则在气泡内顶部展示文件预览卡片
    - 若消息有 thinking 字段，则在内容顶部展示可折叠的深度思考面板
    - 消息文本通过 MarkdownRenderer 渲染（支持 Markdown + 代码高亮）
-->
<script setup lang="ts">
import { ref } from 'vue'
import type { Message } from '@/types'
import MarkdownRenderer from './MarkdownRenderer.vue'

/** 接收父组件传入的单条消息对象 */
const props = defineProps<{ message: Message }>()

/** 深度思考面板是否展开 */
const thinkingExpanded = ref(false)

/** 思考过程是否仍在进行中（thinking 有内容但 answer 还未开始） */
function isThinkingInProgress() {
  return !!props.message.thinking && !props.message.content
}

/** 格式化文件大小为可读字符串 */
function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="message-item" :class="`message-item--${message.role}`">
    <!-- 消息气泡 -->
    <div class="message-item__bubble">
      <!-- 附件预览区 -->
      <div v-if="message.files && message.files.length > 0" class="message-item__files">
        <div v-for="(f, i) in message.files" :key="i" class="message-item__file">
          <!-- 图片文件：显示缩略图 -->
          <img v-if="f.previewUrl" :src="f.previewUrl" class="message-item__file-img" />
          <!-- 文档文件：显示文件图标 -->
          <div v-else class="message-item__file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <span class="message-item__file-name">{{ f.name }}</span>
          <span class="message-item__file-size">{{ formatSize(f.size) }}</span>
        </div>
      </div>

      <!-- 深度思考面板（仅 assistant 消息，有 thinking 字段时显示） -->
      <div
        v-if="message.role === 'assistant' && message.thinking"
        class="message-item__thinking"
      >
        <button
          class="message-item__thinking-header"
          @click="thinkingExpanded = !thinkingExpanded"
        >
          <svg
            class="message-item__thinking-chevron"
            :class="{ 'message-item__thinking-chevron--open': thinkingExpanded }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="16"
            height="16"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span class="message-item__thinking-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12"/>
            </svg>
          </span>
          <span class="message-item__thinking-title">
            {{ isThinkingInProgress() ? '深度思考中...' : (thinkingExpanded ? '已深度思考' : '深度思考') }}
          </span>
          <span v-if="isThinkingInProgress()" class="message-item__thinking-dots">
            <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
          </span>
        </button>
        <div v-show="thinkingExpanded" class="message-item__thinking-body">
          <MarkdownRenderer :content="message.thinking" />
        </div>
      </div>

      <!-- 消息文本（Markdown 渲染） -->
      <div v-if="message.content" class="message-item__content">
        <MarkdownRenderer :content="message.content" />
      </div>

      <!-- 加载动画：assistant 消息为空且无思考内容时显示三点跳动 -->
      <div v-if="message.role === 'assistant' && !message.content && !message.thinking" class="message-item__loading">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.message-item {
  display: flex;
  padding: 8px 0;

  /* 用户消息：靠右对齐 */
  &--user {
    justify-content: flex-end;
  }

  /* 助手消息：靠左对齐 */
  &--assistant {
    justify-content: flex-start;
  }

  /* 气泡通用样式 */
  &__bubble {
    max-width: 75%;
    border-radius: 14px;
    padding: 10px 16px;
    font-size: 15px;
    line-height: 1.65;
  }

  /* 用户气泡：浅灰背景 + 边框 */
  &--user &__bubble {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--bg-hover);

    :deep(a) { color: var(--accent-primary); }
    :deep(code) { background: var(--code-bg); }
    :deep(pre.hljs) {
      background: var(--code-block-bg);
      color: var(--text-primary);
    }
  }

  /* 助手气泡：无背景 */
  &--assistant &__bubble {
    color: var(--text-primary);
  }

  /* 附件列表 */
  &__files {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  /* 单个附件卡片 */
  &__file {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    padding: 4px 8px;
    max-width: 180px;
  }

  &--user &__file {
    background: rgba(255, 255, 255, 0.15);
  }

  &__file-img {
    width: 32px;
    height: 32px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__file-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.7;
  }

  &__file-name {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70px;
  }

  &__file-size {
    font-size: 11px;
    opacity: 0.6;
    flex-shrink: 0;
  }

  /* 深度思考面板 */
  &__thinking {
    margin-bottom: 12px;
    border: 1px solid var(--border-primary);
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg-secondary);
  }

  &__thinking-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);
    transition: background 0.15s;

    &:hover {
      background: var(--bg-hover);
    }
  }

  &__thinking-chevron {
    flex-shrink: 0;
    color: var(--text-muted);
    transition: transform 0.2s ease;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__thinking-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--accent-primary, #8b5cf6);
  }

  &__thinking-title {
    flex-shrink: 0;
  }

  &__thinking-dots {
    display: inline-flex;
    gap: 1px;

    .dot {
      animation: thinking-dot 1.4s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  @keyframes thinking-dot {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  &__thinking-body {
    padding: 0 12px 10px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-muted);
    border-top: 1px solid var(--border-primary);

    :deep(p:last-child) {
      margin-bottom: 0;
    }

    :deep(code) {
      background: var(--code-bg);
    }

    :deep(pre.hljs) {
      background: var(--code-block-bg);
      color: var(--text-primary);
      font-size: 13px;
    }
  }

  /* 消息文本容器 */
  &__content {
    word-break: break-word;

    :deep(p:last-child) {
      margin-bottom: 0;
    }
  }

  /* 加载动画 */
  &__loading {
    display: flex;
    gap: 4px;
    padding: 4px 0;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
      animation: loading-dot 1.4s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  @keyframes loading-dot {
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }
}
</style>
