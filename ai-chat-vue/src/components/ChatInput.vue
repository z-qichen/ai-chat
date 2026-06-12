<!--
  ChatInput.vue —— 消息输入框组件

  职责：
    - 文本输入框（自动伸缩高度，最大 200px）
    - 文件上传（支持图片 + 文档，拖拽暂未实现）
    - 发送消息（Enter 发送，Shift+Enter 换行）
    - 操作按钮：联网搜索、深度思考、上传（UI 已绘制，功能未接线）
    - 流式调用 DeepSeek API，逐字渲染 AI 回复

  数据流向：
    - 从 configStore 读取 API Key / 模型 / 系统提示词
    - 从 chatStore 读取当前会话历史，写入用户消息和 AI 回复
    - 调用 services/chat.ts 的 chatStream() 进行 SSE 流式请求

  两种模式：
    - 空态（hasMessages=false）：大输入框，居中显示，带底部提示
    - 有消息态（hasMessages=true）：紧凑输入框，固定在底部
-->
<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { streamReply, continueChat, stopChat, addMessage, uploadFile } from '@/services/api'
import { useConfigStore } from '@/stores/config'
import { useConversationStore } from '@/stores/conversation'
import type { Message, AttachedFile } from '@/types'

const props = defineProps<{ hasMessages: boolean }>()
const configStore = useConfigStore()
const chatStore = useConversationStore()

// ---- 消息 ID 生成 ----
let _msgId = 0
/** 生成全局唯一的消息 ID */
function genMsgId(): string {
  return `msg_${Date.now()}_${++_msgId}`
}

// ---- 输入状态 ----
const inputText = ref('')                          // 输入框文本
const deepThinking = ref(false)                    // 深度思考模式开关
const isGenerating = ref(false)                    // 是否正在生成 AI 回复
const isAborted = ref(false)                       // 生成被中断，可继续
const abortController = ref<AbortController | null>(null) // 当前请求的 AbortController
const activeStreamConversationId = ref<string | null>(null) // 当前流归属的会话 ID
const textareaRef = ref<HTMLTextAreaElement | null>(null) // 输入框 DOM 引用
const fileInputRef = ref<HTMLInputElement | null>(null)   // 隐藏文件 input 引用

// ---- 文件上传 ----

/** 已上传但未发送的文件 */
interface UploadedFile {
  id: string
  file: File
  previewUrl: string | null // 图片有 blob URL 预览，文档为 null
  fileId: string | null     // 后端上传成功后返回的 ID
  uploading: boolean
  error: string | null
}

const uploadedFiles = ref<UploadedFile[]>([])

/** 支持的图片扩展名 */
const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'])
/** 支持的文档扩展名 */
const docExts = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx', 'ppt', 'pptx'])

/** 获取文件名扩展名（小写） */
function getFileExt(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

/** 判断是否为图片类型 */
function isImage(file: File) {
  return file.type.startsWith('image/') || imageExts.has(getFileExt(file.name))
}

let _fileId = 0
/** 处理文件选择：加入上传列表，立即上传到后端获取 fileId */
function handleFiles(files: FileList) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = getFileExt(file.name)
    if (!imageExts.has(ext) && !docExts.has(ext)) continue

    const id = String(++_fileId)
    const previewUrl = isImage(file) ? URL.createObjectURL(file) : null
    const entry: UploadedFile = {
      id,
      file,
      previewUrl,
      fileId: null,
      uploading: true,
      error: null,
    }
    uploadedFiles.value.push(entry)

    uploadFile(file)
      .then((res) => {
        entry.fileId = res.fileId
        entry.uploading = false
      })
      .catch((err) => {
        entry.uploading = false
        entry.error = err.message || '上传失败'
      })
  }
  fileInputRef.value!.value = ''
}

/** 从上传列表中移除文件（同时释放预览 blob URL） */
function removeFile(id: string) {
  const idx = uploadedFiles.value.findIndex((f) => f.id === id)
  if (idx === -1) return
  const f = uploadedFiles.value[idx]
  if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
  uploadedFiles.value.splice(idx, 1)
}

// ---- 输入框高度自适应 ----

/** 根据内容自动调整 textarea 高度（最小 1 行，最大 200px） */
function adjustTextareaHeight() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onInput() {
  adjustTextareaHeight()
}

// ---- 键盘事件 ----

/** Enter 发送，Shift+Enter 换行 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// ---- 发送消息 ----

/**
 * 启动流式对话，发送用户消息并消费 SSE 回复
 *
 * 同时只允许一个流式请求；
 * 若上次生成被中断，可通过"继续生成"按钮继续，或直接发新消息开始新一轮。
 */
async function send() {
  if (isGenerating.value) return

  const text = inputText.value.trim()
  // 至少要输入文本或上传了文件
  if (!text && uploadedFiles.value.length === 0) return

  const userMessage = text

  // 构建附件信息（用于消息气泡展示）
  const files: AttachedFile[] = uploadedFiles.value.map((f) => ({
    name: f.file.name,
    size: f.file.size,
    previewUrl: f.previewUrl,
    isImage: f.previewUrl !== null,
  }))

  // 收集已上传成功的文件 ID
  const fileIds = uploadedFiles.value
    .filter((f) => f.fileId !== null)
    .map((f) => f.fileId!)

  // 清空输入状态
  inputText.value = ''
  uploadedFiles.value = []
  nextTick(adjustTextareaHeight)

  if (!userMessage && files.length === 0) return

  const { model } = configStore.config

  if (!chatStore.currentId) {
    chatStore.createSession()
  }
  const conversationId = chatStore.currentId!

  // 新消息覆盖中断状态
  isAborted.value = false

  // 添加用户消息到本地 Store
  chatStore.addMessageToSession(conversationId, {
    id: genMsgId(),
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
    files: files.length > 0 ? files : undefined,
  })

  // 保存用户消息到后端
  try {
    await addMessage(conversationId, 'user', userMessage, fileIds)
  } catch (err) {
    console.error('保存用户消息失败:', err)
  }

  // 添加空的 assistant 消息（占位，等待流式填充）
  const assistantMessageId = genMsgId()
  chatStore.addMessageToSession(conversationId, {
    id: assistantMessageId,
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
  })

  // 发起 SSE 流式请求
  const ctrl = new AbortController()
  abortController.value = ctrl
  activeStreamConversationId.value = conversationId
  isGenerating.value = true

  const stream = streamReply(
    conversationId,
    deepThinking.value ? 'deepseek-reasoner' : model,
    deepThinking.value,
    ctrl.signal
  )

  await consumeStream(stream, deepThinking.value, conversationId, assistantMessageId)
}

/**
 * 从上次中断处继续生成
 *
 * 调用后端 /chat/continue 获取新 SSE 流，
 * 追加到当前会话最后一条 assistant 消息末尾。
 */
async function continueGeneration() {
  if (isGenerating.value) return
  if (!chatStore.currentId) return

  const { model } = configStore.config
  const conversationId = chatStore.currentId
  const lastAssistantMessage = [...chatStore.currentMessages()].reverse().find((msg) => msg.role === 'assistant')
  if (!lastAssistantMessage) return

  const ctrl = new AbortController()
  abortController.value = ctrl
  activeStreamConversationId.value = conversationId
  isGenerating.value = true
  isAborted.value = false

  const stream = continueChat(
    conversationId,
    deepThinking.value ? 'deepseek-reasoner' : model,
    deepThinking.value,
    ctrl.signal
  )

  await consumeStream(stream, deepThinking.value, conversationId, lastAssistantMessage.id)
}

/**
 * 消费 SSE 流式生成器，根据 type 分发到 thinking 或 content
 *
 * 中断处理：
 *   - chunk.aborted 为 true：后端已确认中断 → isAborted = true
 *   - AbortError：前端主动断开 → isAborted = true
 */
async function consumeStream(
  stream: AsyncGenerator<import('@/types').StreamChunk>,
  allowThinking: boolean,
  conversationId: string,
  assistantMessageId: string
) {
  try {
    for await (const chunk of stream) {
      if (chunk.done) {
        if (chunk.aborted) {
          isAborted.value = true
        }
        break
      }
      if (chunk.type === 'thinking') {
        if (!allowThinking) continue
        chatStore.appendToMessage(conversationId, assistantMessageId, chunk.content, 'thinking')
      } else {
        chatStore.appendToMessage(conversationId, assistantMessageId, chunk.content)
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      isAborted.value = true
    } else {
      console.error('流式请求异常:', err)
    }
  } finally {
    isGenerating.value = false
    abortController.value = null
    activeStreamConversationId.value = null
  }
}

// ---- 停止生成 ----

/** 停止当前 AI 生成（双路径：显式 API + 断连兜底） */
function stopGeneration() {
  const currentId = activeStreamConversationId.value ?? chatStore.currentId
  if (currentId) {
    stopChat(currentId).catch(() => {})
  }
  if (abortController.value) {
    abortController.value.abort()
  }
}

// ---- 工具函数 ----

/** 切换深度思考模式 */
function toggleDeepThinking() {
  deepThinking.value = !deepThinking.value
}

/** 格式化文件大小 */
function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <!-- 生成中断提示栏 -->
  <div v-if="isAborted" class="chat-input__continue-bar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" class="chat-input__continue-icon">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>生成已中断</span>
    <button class="chat-input__continue-btn" @click="continueGeneration">继续生成</button>
  </div>

  <div class="chat-input-wrapper" :class="{ 'chat-input-wrapper--compact': hasMessages }">
    <div class="chat-input" :class="{ 'chat-input--compact': hasMessages }">
      <!-- 操作按钮行：联网搜索 / 深度思考 / 上传 -->
      <div class="chat-input__actions">
        <button class="chat-input__action-btn" title="联网搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.3-4.3"/>
          </svg>
          <span>联网搜索</span>
        </button>
        <button
          class="chat-input__action-btn"
          :class="{ 'chat-input__action-btn--active': deepThinking }"
          title="深度思考"
          @click="toggleDeepThinking"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12m11.32-11.32l2.12-2.12"/>
          </svg>
          <span>深度思考</span>
        </button>
        <!-- 上传按钮：触发隐藏的 file input -->
        <button class="chat-input__action-btn chat-input__upload-btn" title="上传文件" @click="fileInputRef?.click()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
          <span>上传</span>
        </button>
        <!-- 隐藏的文件选择 input -->
        <input
          ref="fileInputRef"
          type="file"
          multiple
          hidden
          accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.ppt,.pptx"
          @change="handleFiles(($event.target as HTMLInputElement).files!)"
        />
      </div>

      <!-- 已上传文件预览区 -->
      <div class="chat-input__files" v-if="uploadedFiles.length > 0">
        <div
          v-for="f in uploadedFiles"
          :key="f.id"
          class="chat-input__file-card"
          :class="{ 'chat-input__file-card--error': f.error, 'chat-input__file-card--uploading': f.uploading }"
        >
          <!-- 上传中：显示加载动画 -->
          <div v-if="f.uploading" class="chat-input__file-spinner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="20" height="20">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
              <path d="M12 2a10 10 0 019.95 9" stroke-linecap="round"/>
            </svg>
          </div>
          <!-- 图片：显示缩略图 -->
          <img v-else-if="f.previewUrl" :src="f.previewUrl" class="chat-input__file-thumb" />
          <!-- 文档：显示图标 -->
          <div v-else class="chat-input__file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <span class="chat-input__file-name" :title="f.file.name">{{ f.file.name }}</span>
          <span class="chat-input__file-size">{{ f.uploading ? '上传中...' : f.error ? '上传失败' : formatSize(f.file.size) }}</span>
          <!-- 移除按钮 -->
          <button class="chat-input__file-remove" @click="removeFile(f.id)" title="移除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 输入区域：textarea + 发送按钮 -->
      <div class="chat-input__body">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="chat-input__textarea"
          :placeholder="hasMessages ? '输入消息...' : '输入你的问题...'"
          rows="1"
          @input="onInput"
          @keydown="onKeydown"
        ></textarea>

        <!-- 发送/停止按钮 -->
        <button
          v-if="isGenerating"
          class="chat-input__stop-btn"
          title="停止生成"
          @click="stopGeneration"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <rect x="4" y="4" width="16" height="16" rx="2"/>
          </svg>
        </button>
        <button
          v-else
          class="chat-input__send-btn"
          :class="{ 'chat-input__send-btn--active': inputText.trim().length > 0 || uploadedFiles.length > 0 }"
          :disabled="!inputText.trim() && uploadedFiles.length === 0"
          @click="send"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      <!-- 空态提示：AI 生成内容免责声明 -->
      <p class="chat-input__tip" v-if="!hasMessages">
        内容由AI生成，仅供参考
      </p>
    </div>
  </div>
</template>

<style scoped lang="less">
/* 输入框外层包装 */
.chat-input-wrapper {
  display: flex;
  justify-content: center;
  padding: 0 1.5rem;
  flex-shrink: 0;

  /* 紧凑模式 */
  &--compact {
    padding: 1rem 1.5rem 1.5rem;
  }
}

/* 输入框主体 */
.chat-input {
  width: 100%;
  max-width: 800px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 1rem;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;

  /* 紧凑模式：小圆角、小内边距、轻阴影 */
  &--compact {
    max-width: 800px;
    border-radius: 0.75rem;
    padding: 0.625rem 1rem;
    box-shadow: var(--shadow-sm);
    border-color: var(--border-secondary);

    &:focus-within {
      border-color: var(--accent-primary);
      box-shadow: 0 1px 8px var(--accent-shadow);
    }
  }

  /* 聚焦时边框高亮 */
  &:focus-within {
    border-color: var(--accent-primary);
  }
}

/* 操作按钮行 */
.chat-input__actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.chat-input__action-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 1.25rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
  background: var(--bg-input);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--border-secondary);
    color: var(--text-secondary);
  }

  /* 激活状态：紫色高亮 */
  &--active {
    background: var(--accent-light);
    border-color: var(--accent-border);
    color: var(--accent-hover);

    &:hover {
      background: var(--accent-lighter);
      border-color: var(--accent-primary);
    }
  }
}

/* 上传按钮：推到最右侧 */
.chat-input__upload-btn {
  margin-left: auto;
}

/* 文件预览区 */
.chat-input__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

/* 单个文件卡片 */
.chat-input__file-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-file);
  border: 1px solid var(--border-primary);
  border-radius: 0.625rem;
  padding: 0.375rem 0.625rem;
  max-width: 220px;
  overflow: hidden;

  &--error {
    border-color: var(--danger-border, #fca5a5);
    background: var(--danger-light, #fef2f2);
  }

  &--uploading {
    border-color: var(--accent-border, #c4b5fd);
  }
}

/* 上传中旋转动画 */
.chat-input__file-spinner {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.chat-input__file-thumb {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: cover;
  border-radius: 0.375rem;
  flex-shrink: 0;
}

.chat-input__file-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-file-icon);
  border-radius: 0.375rem;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.chat-input__file-name {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 5rem;
}

.chat-input__file-size {
  font-size: 0.6875rem;
  color: var(--text-placeholder);
  flex-shrink: 0;
}

/* 文件移除按钮（悬浮在右上角） */
.chat-input__file-remove {
  position: absolute;
  top: -0.375rem;
  right: -0.3125rem;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;

  &:hover {
    background: var(--danger-light);
    border-color: var(--danger-border);
    color: var(--danger);
  }
}

/* 输入区域：textarea + 发送按钮 */
.chat-input__body {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

/* 文本输入框 */
.chat-input__textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-primary);
  background: transparent;
  min-height: 1.5rem;
  max-height: 12.5rem;

  &::placeholder {
    color: var(--text-placeholder);
  }
}

.chat-input--compact .chat-input__textarea {
  font-size: 0.875rem;
}

/* 发送按钮 */
.chat-input__send-btn {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-alt);
  color: var(--text-placeholder);
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  /* 有内容时：紫色高亮 */
  &--active {
    background: var(--accent-primary);
    color: var(--text-inverse);

    &:hover {
      background: var(--accent-hover);
    }
  }
}

/* 停止生成按钮 */
.chat-input__stop-btn {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--danger);
  color: var(--text-inverse);
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &:hover {
    background: var(--danger-hover, #c0392b);
  }
}

/* 生成中断提示栏 */
.chat-input__continue-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--warning-light, #fef3c7);
  border-bottom: 1px solid var(--warning-border, #fcd34d);
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.chat-input__continue-icon {
  color: var(--warning, #f59e0b);
  flex-shrink: 0;
}

.chat-input__continue-btn {
  padding: 0.125rem 0.75rem;
  border: 1px solid var(--accent-primary);
  border-radius: 0.875rem;
  font-size: 0.75rem;
  color: var(--accent-primary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: var(--accent-light);
    border-color: var(--accent-hover);
    color: var(--accent-hover);
  }
}

/* 底部提示文字 */
.chat-input__tip {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-placeholder);
  margin-top: 0.75rem;
}

/* ---- 移动端 ---- */
@media (max-width: 768px) {
  .chat-input-wrapper {
    padding: 0 0.75rem;

    &--compact {
      padding: 0.75rem 0.75rem 1rem;
    }
  }

  .chat-input {
    border-radius: 0.75rem;
    padding: 0.75rem;

    &--compact {
      padding: 0.5rem 0.75rem;
      border-radius: 0.625rem;
    }
  }

  .chat-input__actions {
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .chat-input__action-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    gap: 0.125rem;
  }
}
</style>
