/**
 * stores/conversation.ts —— 会话与消息状态管理（含本地持久化）
 *
 * 职责：
 *   - 管理侧边栏会话元数据列表（sessions），持久化到 localStorage
 *   - 管理当前会话的消息缓存（messagesCache），仅存内存不持久化
 *   - 消息按需从后端加载，支持游标分页（最新优先，向上翻页加载更早消息）
 *   - 会话 CRUD（创建、删除、标题编辑、切换）
 *
 * 数据结构：
 *   sessions:        SessionMeta[]             → 持久化 localStorage，用于侧边栏渲染
 *   messagesCache:   Record<id, CacheEntry>    → 内存缓存，按会话 ID 索引
 *   currentId:       string | null             → 当前激活的会话 ID
 *
 * 持久化策略：
 *   - 仅持久化 sessions（id + title + updatedAt），体积极小
 *   - 消息内容不持久化，每次切换会话时按需从后端加载
 *   - 通过 Pinia $subscribe 自动写入 localStorage
 *   - 初始化时从 localStorage 恢复 sessions，实现离线快速渲染
 *
 * 消息分页流程：
 *   1. selectSession(id) → 检查 messagesCache[id]，无缓存则 loadMessages(id)
 *   2. loadMessages(id)  → GET /messages?limit=50  返回最新 50 条
 *   3. MessageList 检测滚动到顶部 → loadMoreMessages(id)
 *   4. loadMoreMessages(id) → GET /messages?before=<cursor>&limit=50  返回更早消息
 *   5. 返回的消息 unshift 到 messages 头部，保持 scroll 位置
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { SessionMeta, Message } from '@/types'

/** localStorage key */
const STORAGE_KEY = 'ai-chat-sessions'

/** 每页消息数量 */
const PAGE_SIZE = 50

/** 单个会话的消息缓存条目 */
interface CacheEntry {
  /** 已加载的消息列表，时间正序（旧→新） */
  messages: Message[]
  /** 是否还有更早的消息可加载 */
  hasMore: boolean
  /** 游标：当前已加载的最老消息 ID，用于加载上一页 */
  cursor: string | null
  /** 该会话消息总数（由后端返回，首次加载时获取） */
  total: number
}

/**
 * 解析消息中的 files 字段，将 JSON 字符串转为 AttachedFile[]
 *
 * 后端存储的 files 是文件 ID 的 JSON 字符串（如 '["uuid1","uuid2"]'），
 * 渲染需要包含 name / size 的 AttachedFile 对象数组。
 * 通过调用文件元数据接口，将字符串替换为结构化对象。
 */
async function resolveMessageFiles(messages: Message[]) {
  const fileIdSet = new Set<string>()
  const messagesToResolve: { message: Message; ids: string[] }[] = []

  for (const message of messages) {
    if (typeof message.files === 'string') {
      try {
        const ids: string[] = JSON.parse(message.files)
        if (Array.isArray(ids) && ids.length > 0) {
          messagesToResolve.push({ message, ids })
          ids.forEach((id) => fileIdSet.add(id))
        } else {
          message.files = undefined
        }
      } catch {
        message.files = undefined
      }
    }
  }

  if (fileIdSet.size === 0) return

  const { getFileMeta } = await import('@/services/api')
  const metaMap = new Map<string, { name: string; size: number; isImage: boolean }>()

  const results = await Promise.allSettled(
    [...fileIdSet].map(async (id) => {
      const meta = await getFileMeta(id)
      return { id, meta }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { id, meta } = result.value
      metaMap.set(id, {
        name: meta.originalName,
        size: meta.size,
        isImage: meta.mimeType.startsWith('image/'),
      })
    }
  }

  for (const { message, ids } of messagesToResolve) {
    message.files = ids
      .map((id) => {
        const meta = metaMap.get(id)
        if (!meta) return null
        return {
          name: meta.name,
          size: meta.size,
          previewUrl: null,
          isImage: meta.isImage,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }
}

export const useConversationStore = defineStore('conversation', () => {
  // ============================================================
  // State
  // ============================================================

  /** 所有会话元数据列表（按 updatedAt 降序，最新在前） */
  const sessions = ref<SessionMeta[]>([])

  /** 消息缓存：key = 会话 ID，value = 该会话已加载的消息 */
  const messagesCache = ref<Record<string, CacheEntry>>({})

  /** 当前激活的会话 ID */
  const currentId = ref<string | null>(null)

  /** 是否正在首次加载消息 */
  const loading = ref(false)

  /** 是否正在加载更多（向上翻页） */
  const loadingMore = ref(false)

  // ============================================================
  // Getters
  // ============================================================

  function isSameMessage(left: Message, right: Message): boolean {
    return left.role === right.role && left.content === right.content
  }

  /** 当前会话的所有消息（已加载部分） */
  function currentMessages(): Message[] {
    if (!currentId.value) return []
    return messagesCache.value[currentId.value]?.messages ?? []
  }

  /** 当前会话是否还有更多消息可加载 */
  function hasMoreMessages(): boolean {
    if (!currentId.value) return false
    return messagesCache.value[currentId.value]?.hasMore ?? false
  }

  /** 当前会话的消息总数 */
  function currentTotal(): number {
    if (!currentId.value) return 0
    return messagesCache.value[currentId.value]?.total ?? 0
  }

  // ============================================================
  // localStorage 持久化
  // ============================================================

  /** 从 localStorage 恢复 sessions 和 currentId */
  function hydrate() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (Array.isArray(data)) {
          // 旧格式兼容：仅 sessions 数组
          sessions.value = data
        } else {
          // 新格式：{ currentId, sessions }
          sessions.value = data.sessions || []
          if (data.currentId && sessions.value.some((s: SessionMeta) => s.id === data.currentId)) {
            selectSession(data.currentId)
          }
        }
      }
    } catch {
      sessions.value = []
    }
  }

  /** 将 sessions 和 currentId 写入 localStorage */
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentId: currentId.value,
        sessions: sessions.value,
      }))
    } catch { /* 存储满或私有模式下忽略 */ }
  }

  // 初始化时恢复本地数据
  hydrate()

  // 如果有 token，从后端同步最新会话列表（异步，不阻塞渲染）
  syncFromBackend()

  // 自动持久化
  watch(sessions, persist, { deep: true })
  watch(currentId, persist)

  // ============================================================
  // 会话管理 Actions
  // ============================================================

  /** 新建空白会话：当前会话有消息时才新建，否则复用空会话 */
  function createSession() {
    // 1. 当前会话为空 → 复用
    if (currentId.value) {
      const cached = messagesCache.value[currentId.value]
      if (!cached || cached.messages.length === 0) {
        return
      }
    }
    // 2. 最新会话为空 → 切换到它，复用
    const latest = sessions.value[0]
    if (latest && latest.messageCount === 0) {
      currentId.value = latest.id
      return
    }

    const id = `conv_${Date.now()}`
    const now = Date.now()
    sessions.value.unshift({ id, title: '新对话', updatedAt: now, messageCount: 0 })
    currentId.value = id
  }

  /** 删除指定会话 */
  function deleteSession(id: string) {
    // 异步同步后端（fire-and-forget，不阻塞本地操作）
    import('@/services/api').then(({ deleteConversation }) => {
      deleteConversation(id).catch(() => {})
    })
    // 本地立即删除
    sessions.value = sessions.value.filter((s) => s.id !== id)
    delete messagesCache.value[id]
    if (currentId.value === id) {
      currentId.value = sessions.value[0]?.id ?? null
    }
  }

  /** 修改会话标题 */
  function updateTitle(id: string, title: string) {
    // 本地乐观更新
    const session = sessions.value.find((s) => s.id === id)
    if (session) {
      session.title = title
      session.updatedAt = Date.now()
    }
    // 异步同步后端（fire-and-forget）
    import('@/services/api').then(({ updateConversation }) => {
      updateConversation(id, title).catch(() => {})
    })
  }

  /** 用后端数据替换本地会话列表（登录后同步） */
  function replaceSessions(list: SessionMeta[]) {
    sessions.value = list
    // 清除旧用户的消息缓存
    messagesCache.value = {}
    // 如果当前选中的会话不在新列表中，重置
    if (currentId.value && !list.some((s) => s.id === currentId.value)) {
      currentId.value = list.length > 0 ? list[0].id : null
    }
    // 若没有当前会话，默认选中第一条
    if (!currentId.value && list.length > 0) {
      currentId.value = list[0].id
    }
  }

  /** 应用启动时从后端拉取最新会话列表，清洗掉本地脏数据（后端不可用时保留本地数据） */
  async function syncFromBackend() {
    const token = localStorage.getItem('ai-chat-token')
    if (!token) return
    try {
      const { getConversations } = await import('@/services/api')
      const backendSessions = await getConversations()
      if (localStorage.getItem('ai-chat-token') !== token) return
      replaceSessions(backendSessions)
    } catch {
      // 后端不可用，保留本地数据
    }
  }

  /** 切换到指定会话 */
  function selectSession(id: string) {
    currentId.value = id
    // 首次进入该会话 → 从后端加载消息
    if (!messagesCache.value[id]) {
      loadMessages(id)
    }
  }

  // ============================================================
  // 消息加载 Actions
  // ============================================================

  /** 首次加载：获取最新一页消息 */
  async function loadMessages(id: string) {
    loading.value = true
    try {
      const { getMessages } = await import('@/services/api')
      const res = await getMessages(id, undefined, PAGE_SIZE)
      await resolveMessageFiles(res.messages)
      const existingMessages = messagesCache.value[id]?.messages ?? []
      const mergedMessages = [...res.messages]
      for (const message of existingMessages) {
        const duplicated = mergedMessages.some((item) => item.id === message.id || isSameMessage(item, message))
        if (!duplicated) mergedMessages.push(message)
      }
      mergedMessages.sort((left, right) => left.timestamp - right.timestamp)
      messagesCache.value[id] = {
        messages: mergedMessages,
        hasMore: res.hasMore,
        cursor: mergedMessages.length > 0 ? mergedMessages[0].id : null,
        total: Math.max(res.total, mergedMessages.length),
      }
      // 同步会话元数据的消息计数
      const session = sessions.value.find((s) => s.id === id)
      if (session) {
        session.messageCount = res.total
      }
    } catch (err) {
      console.warn('消息加载失败（后端可能未启动，使用空列表）:', err)
      messagesCache.value[id] = {
        messages: [],
        hasMore: false,
        cursor: null,
        total: 0,
      }
    } finally {
      loading.value = false
    }
  }

  /** 向上翻页：加载更早的消息 */
  async function loadMoreMessages(id: string) {
    const cache = messagesCache.value[id]
    if (!cache || !cache.hasMore || !cache.cursor) return

    loadingMore.value = true
    try {
      const { getMessages } = await import('@/services/api')
      const res = await getMessages(id, cache.cursor, PAGE_SIZE)
      await resolveMessageFiles(res.messages)
      // 将更早的消息插入到数组头部（保持正序：旧→新）
      cache.messages.unshift(...res.messages)
      cache.hasMore = res.hasMore
      // 更新游标为新加载的最老消息 ID
      if (res.messages.length > 0) {
        cache.cursor = res.messages[0].id
      } else {
        cache.hasMore = false
      }
      cache.total = res.total
    } catch (err) {
      console.warn('加载更多消息失败:', err)
    } finally {
      loadingMore.value = false
    }
  }

  // ============================================================
  // 消息操作 Actions
  // ============================================================

  /** 向当前会话追加一条消息 */
  function addMessage(message: Message) {
    const id = ensureCurrentSessionId()
    addMessageToSession(id, message)
  }

  /** 向指定会话追加一条消息 */
  function addMessageToSession(sessionId: string, message: Message) {
    const cache = ensureCacheForSession(sessionId)
    const duplicated = cache.messages.some((item) => item.id === message.id || isSameMessage(item, message))
    if (duplicated) return
    cache.messages.push(message)
    // 更新会话元数据消息计数
    const session = sessions.value.find((s) => s.id === sessionId)
    if (session) {
      session.messageCount = Math.max(session.messageCount, cache.messages.length)
    }
    // 同步更新侧边栏时间
    touchSession(sessionId)
  }

  /** 追加文本到当前会话最后一条消息指定字段末尾（流式打字机） */
  function appendToLastMessage(content: string, field: 'content' | 'thinking' = 'content') {
    const id = ensureCurrentSessionId()
    const cache = ensureCacheForSession(id)
    if (cache.messages.length === 0) return
    const last = cache.messages[cache.messages.length - 1]
    appendToMessage(id, last.id, content, field)
  }

  /** 追加文本到指定会话的指定消息 */
  function appendToMessage(
    sessionId: string,
    messageId: string,
    content: string,
    field: 'content' | 'thinking' = 'content'
  ) {
    const cache = ensureCacheForSession(sessionId)
    const message = cache.messages.find((item) => item.id === messageId)
    if (!message) return
    if (field === 'thinking') {
      message.thinking = (message.thinking ?? '') + content
    } else {
      message.content += content
    }
    touchSession(sessionId)
  }

  /** 确保当前会话的缓存条目存在（无当前会话时自动创建） */
  function ensureCache(): CacheEntry {
    const id = ensureCurrentSessionId()
    return ensureCacheForSession(id)
  }

  function ensureCurrentSessionId(): string {
    if (!currentId.value) {
      createSession()
    }
    return currentId.value!
  }

  function ensureCacheForSession(sessionId: string): CacheEntry {
    if (!messagesCache.value[sessionId]) {
      messagesCache.value[sessionId] = {
        messages: [],
        hasMore: false,
        cursor: null,
        total: 0,
      }
    }
    return messagesCache.value[sessionId]
  }

  /** 更新当前会话的 updatedAt 时间 */
  function touchSession(sessionId = currentId.value) {
    const id = sessionId
    if (!id) return
    const session = sessions.value.find((s) => s.id === id)
    if (session) {
      session.updatedAt = Date.now()
    }
  }

  // ============================================================
  // 导出
  // ============================================================

  return {
    // State
    sessions,
    messagesCache,
    currentId,
    loading,
    loadingMore,
    // Getters
    currentMessages,
    hasMoreMessages,
    currentTotal,
    // 持久化
    hydrate,
    persist,
    // 会话管理
    replaceSessions,
    syncFromBackend,
    createSession,
    deleteSession,
    updateTitle,
    selectSession,
    // 消息加载
    loadMessages,
    loadMoreMessages,
    // 消息操作
    addMessage,
    addMessageToSession,
    appendToLastMessage,
    appendToMessage,
  }
})
