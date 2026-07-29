/**
 * types/api.ts —— API 请求/响应类型定义
 *
 * 定义与后端 API 通信相关的请求配置、响应结构、流式数据块等类型。
 * 这些类型面向 HTTP 通信层，部分引用 domain.ts 中的领域模型。
 */

import type { User, SessionMeta, Message } from './domain'

// ---- 流式响应 ----

/** SSE 流式响应中 yield 的每个数据块 */
export interface StreamChunk {
  /** 本块包含的增量文本内容 */
  content: string
  /** 流是否已结束（true 表示服务端完成响应） */
  done: boolean
  /** 内容类型：thinking=思考过程，answer=最终回答，memories_added=记忆已添加，meta=元数据，tool_call=工具调用，tool_result=工具结果 */
  type?: 'thinking' | 'answer' | 'memories_added' | 'meta' | 'tool_call' | 'tool_result'
  /** 是否被用户中止 */
  aborted?: boolean
  /** 工具调用列表 */
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>
  /** 工具调用名称（type=tool_call 或 tool_result 时有值） */
  toolCallName?: string
  /** 工具调用参数 JSON 字符串（type=tool_call 时有值） */
  toolCallArgs?: string
  /** 联网搜索结果（type=tool_result 且 toolCallName=web_search 时有值） */
  searchData?: {
    answer?: string
    results: Array<{ title: string; url: string; content: string; score: number }>
    responseTime: number
  }
  /** 本次新增的记忆条数 */
  memoriesAdded?: number
  /** 流结束时后端持久化的 assistant 消息真实 ID（用于回填本地乐观消息 ID） */
  messageId?: string
  /** 当前上下文 token 数（type=meta 时有值） */
  tokenCount?: number
  /** 上下文 token 上限（type=meta 时有值） */
  tokenLimit?: number
}

// ---- 文件上传 ----

/** 文件上传 API 响应 */
export interface UploadFileResponse {
  fileId: string
  originalName: string
  mimeType: string
  size: number
}

/** 文件元数据（查询接口返回，含创建时间） */
export interface FileMeta extends UploadFileResponse {
  createdAt: number
}

// ---- 认证 ----

/** 登录/注册接口返回的完整数据 */
export interface AuthResponse {
  token: string
  user: User
  conversations: Array<{
    id: string
    userId: string
    title: string
    model: string
    createdAt: number
    updatedAt: number
  }>
}

// ---- 统一请求配置 ----

/** 统一请求配置（不含 method/body，由调用方传入 options） */
export interface RequestOptions extends RequestInit {
  /** AbortSignal，用于取消请求 */
  signal?: AbortSignal
}

// ---- 会话分页 ----

/** 会话分页返回结构 */
export interface PaginatedConversations {
  data: SessionMeta[]
  nextCursor: string | null
  hasMore: boolean
}

// ---- 消息分页 ----

/** 分页返回结构 */
export interface MessagesResponse {
  /** 消息列表，时间正序（旧→新） */
  messages: Message[]
  /** 是否还有更早的消息 */
  hasMore: boolean
  /** 该会话消息总数 */
  total: number
}

// ---- 模型 ----

/** 模型条目 */
export interface ModelItem {
  value: string
  label: string
}

/** 模型校验响应 */
export interface ValidateModelResponse {
  valid: boolean
  model: string
  error?: string
  suggestion?: string
}

// ---- 用户设置 ----

/** 用户设置响应 */
export interface UserSettingsResponse {
  systemPrompt: string | null
}
