/**
 * services/api.ts —— 后端 API HTTP 客户端
 *
 * 封装与 Fastify.js 后端的通信接口，包括：
 *   - 会话 CRUD（列表、创建、更新标题、删除）
 *   - 消息分页加载（游标分页，优先返回最新消息）
 *   - 消息新增与 SSE 流式回复
 *
 * 注：后端不可用时自动降级为本地模式，不影响前端正常使用。
 */

import type { SessionMeta, Message, StreamChunk, AuthResponse, UploadFileResponse, FileMeta, MemoryItem } from '@/types'

/** 后端 API 基础地址 */
const BASE = 'http://localhost:4000/api'

/** localStorage token key */
const TOKEN_KEY = 'ai-chat-token'

/** 统一请求配置（不含 method/body，由调用方传入 options） */
export interface RequestOptions extends RequestInit {
  /** AbortSignal，用于取消请求 */
  signal?: AbortSignal
}

/** 统一请求封装：自动附加 JSON 头、Token 与错误处理 */
async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const body = await res.text()
    let message = `请求失败 (${res.status})`
    try {
      const parsed = JSON.parse(body)
      message = parsed.error || parsed.message || message
    } catch {}
    throw new Error(message)
  }
  return res.json()
}

// ---- 认证 API ----

/** 用户注册 */
export function register(username: string, password: string): Promise<AuthResponse> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

/** 用户登录 */
export function login(username: string, password: string): Promise<AuthResponse> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

// ---- 会话 API ----

/** 后端会话分页响应包装 */
interface ConversationsListResponse {
  data: Array<{
    id: string
    userId: string
    title: string
    model: string
    createdAt: number
    updatedAt: number
  }>
  nextCursor: string | null
  hasMore: boolean
}

/** 后端单会话响应包装 */
interface ConversationDetailResponse {
  data: {
    id: string
    userId: string
    title: string
    model: string
    createdAt: number
    updatedAt: number
  }
}

/** 后端 Conversation → 前端 SessionMeta 映射 */
function toSessionMeta(c: ConversationsListResponse['data'][number]): SessionMeta {
  return {
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt,
    messageCount: 0,
  }
}

/** 会话分页返回结构 */
export interface PaginatedConversations {
  data: SessionMeta[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * 获取会话元数据列表（游标分页）
 *
 * @param cursor  游标，不传则返回最新一页
 * @param limit   每页条数，默认 30
 */
export async function getConversations(
  cursor?: string | null,
  limit = 30
): Promise<PaginatedConversations> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  const path = `/conversations?${params}`
  const res = await request<ConversationsListResponse>(path)
  return {
    data: (res.data || []).map(toSessionMeta),
    nextCursor: res.nextCursor,
    hasMore: res.hasMore,
  }
}

/** 创建新会话 */
export async function createConversation(title: string): Promise<SessionMeta> {
  const res = await request<ConversationDetailResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return toSessionMeta(res.data)
}

/** 更新会话标题 */
export function updateConversation(id: string, title: string): Promise<void> {
  return request(`/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

/** 删除会话（级联删除所有消息） */
export function deleteConversation(id: string): Promise<void> {
  return request(`/conversations/${id}`, { method: 'DELETE' })
}

// ---- 消息 API ----

/** 分页返回结构 */
export interface MessagesResponse {
  /** 消息列表，时间正序（旧→新） */
  messages: Message[]
  /** 是否还有更早的消息 */
  hasMore: boolean
  /** 该会话消息总数 */
  total: number
}

/**
 * 获取会话消息（游标分页）
 *
 * @param id      会话 ID
 * @param cursor  游标：返回早于此时间戳的一页（不传则返回最新一页）
 * @param limit   每页条数，默认 50
 */
export function getMessages(
  id: string,
  cursor?: string,
  limit = 50
): Promise<MessagesResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return request(`/conversations/${id}/messages?${params}`)
}

/**
 * 新增一条消息（用户发送或 AI 回复）
 *
 * @param id       会话 ID
 * @param role     角色：user / assistant / system
 * @param content  消息内容
 * @param files    附件文件 ID 列表，以 JSON 字符串存储
 */
export function addMessage(
  id: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  files?: string[]
): Promise<Message> {
  return request(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content, files: files?.length ? JSON.stringify(files) : undefined }),
  })
}

/**
 * SSE 流式 AI 回复（异步生成器）
 *
 * 后端对接 DeepSeek API，通过 SSE 逐块返回生成内容。
 * 消费方式与 services/chat.ts 的 chatStream() 一致。
 *
 * @param id       会话 ID
 * @param model    模型名称
 * @param thinking 是否开启深度思考模式
 * @param signal   AbortSignal 用于取消请求
 */
export async function* streamReply(
  id: string,
  model: string,
  thinking?: boolean,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body: Record<string, unknown> = { model }
  if (thinking) {
    body.thinking = { type: 'enabled' }
  }

  const res = await fetch(`${BASE}/conversations/${id}/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`流式请求失败 ${res.status}: ${body}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const payload = trimmed.slice(5).trim()
      try {
        const parsed = JSON.parse(payload)
        if (parsed.error) {
          throw new Error(parsed.error)
        }
        yield {
          content: parsed.content,
          done: parsed.done,
          type: parsed.type,
          aborted: parsed.aborted,
          messageId: parsed.messageId,
        }
        if (parsed.done) return
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  yield { content: '', done: true }
}

// ---- 流式对话控制 API ----

/** 停止当前对话的流式生成 */
export async function stopChat(id: string): Promise<{ success: boolean; message?: string }> {
  return request(`/conversations/${id}/chat/stop`, { method: 'POST' })
}

/**
 * 从上次中断处继续生成（SSE 流式，异步生成器）
 *
 * 行为与 streamReply 一致，仅请求 URL 不同。
 * 后端会使用已保存的部分 assistant 内容作为上下文，调 DeepSeek 继续输出。
 */
export async function* continueChat(
  id: string,
  model: string,
  thinking?: boolean,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body: Record<string, unknown> = { model }
  if (thinking) {
    body.thinking = { type: 'enabled' }
  }

  const res = await fetch(`${BASE}/conversations/${id}/chat/continue`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`继续生成请求失败 ${res.status}: ${errBody}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('响应体不可读')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const payload = trimmed.slice(5).trim()
      try {
        const parsed = JSON.parse(payload)
        if (parsed.error) {
          throw new Error(parsed.error)
        }
        yield {
          content: parsed.content,
          done: parsed.done,
          type: parsed.type,
          aborted: parsed.aborted,
          messageId: parsed.messageId,
        }
        if (parsed.done) return
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }

  yield { content: '', done: true }
}

// ---- 模型校验 API ----

/** 模型校验响应 */
export interface ValidateModelResponse {
  valid: boolean
  model: string
  error?: string
  suggestion?: string
}

/**
 * 校验模型名称是否可用
 *
 * 后端校验逻辑：
 * 1. 非空格式检查
 * 2. 精确匹配可用模型列表（忽略大小写）
 * 3. 匹配失败时通过编辑距离算法给出最接近的建议
 *
 * 无需认证
 */
export function validateModel(model: string): Promise<ValidateModelResponse> {
  return request('/models/validate', {
    method: 'POST',
    body: JSON.stringify({ model }),
  })
}

// ---- 文件上传 API ----

/**
 * 上传文件到后端
 *
 * 使用 FormData multipart 方式上传单个文件，
 * 成功后返回文件 ID 供后续消息引用。
 */
export function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const headers: Record<string, string> = {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${BASE}/files/upload`, {
    method: 'POST',
    headers,
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text()
      let message = `上传失败 (${res.status})`
      try { message = JSON.parse(body).error || message } catch {}
      throw new Error(message)
    }
    return res.json()
  })
}

/** 查询文件元数据 */
export function getFileMeta(fileId: string): Promise<FileMeta> {
  return request<FileMeta>(`/files/${fileId}`)
}

// ---- 记忆 API ----

/** 获取当前用户所有记忆 */
export function fetchMemories(): Promise<MemoryItem[]> {
  return request<MemoryItem[]>('/memories')
}

/** 创建一条记忆 */
export function createMemory(data: { category: string; key: string; value: string }): Promise<MemoryItem> {
  return request<MemoryItem>('/memories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 删除一条记忆 */
export function deleteMemory(id: string): Promise<void> {
  return request(`/memories/${id}`, { method: 'DELETE' })
}
