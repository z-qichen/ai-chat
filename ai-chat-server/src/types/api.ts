/**
 * types/api.ts —— API 请求/响应 DTO
 *
 * 定义 REST API 的请求体、响应体、分页结构等数据传输对象，
 * 包括认证、会话、消息、文件、模型校验相关接口。
 */

import type { Conversation } from './domain'

/** 模型展示项 */
export type ModelItem = { value: string; label: string }

/** 模型列表响应 */
export type ModelsListResponse = ModelItem[]

/** 创建会话请求体 */
export interface CreateConversationBody {
  title?: string
  model?: string
}

/** 更新会话请求体 */
export interface UpdateConversationBody {
  title?: string
  model?: string
}

/** 分页查询参数 */
export interface PaginationQuery {
  cursor?: string
  limit?: number
}

/** 游标分页响应 */
export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

/** 思考模式配置 */
export interface ThinkingConfig {
  type: 'enabled' | 'disabled'
}

/** 流式请求体（仅需模型参数，消息已由 addMessage 保存） */
export interface StreamRequestBody {
  model?: string
  thinking?: ThinkingConfig
}

/** 保存消息请求体（简单插入，不触发 AI） */
export interface SaveMessageBody {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: string
}

/** 流式请求体（扩展支持文件引用） */
export interface StreamRequestWithFiles {
  model?: string
  fileIds?: string[]
  thinking?: ThinkingConfig
  systemPrompt?: string
  /** 是否开启联网搜索 */
  webSearch?: boolean
}

/** SSE 流式 chunk */
export interface StreamChunk {
  content: string
  done: boolean
  /** chunk 类型：thinking=思考过程，answer=最终回答，memories_added=记忆提取完成，tool_call=工具调用，tool_result=工具结果 */
  type?: 'thinking' | 'answer' | 'memories_added' | 'tool_call' | 'tool_result'
  /** 工具调用名称（type=tool_call 或 tool_result 时有值） */
  toolCallName?: string
  /** 工具调用参数 JSON 字符串（type=tool_call 时有值） */
  toolCallArgs?: string
  /** AI 调用的工具列表（extract_user_info 等） */
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>
  /** 记忆提取完成时携带新增的记忆数量 */
  memoriesAdded?: number
  /** 流结束时携带后端持久化的 assistant 消息真实 ID（用于前端回填本地乐观消息 ID） */
  messageId?: string
  /** 是否被用户中断 */
  aborted?: boolean
  /** 联网搜索结果（type=tool_result 且 toolCallName=web_search 时有值） */
  searchData?: {
    answer?: string
    results: Array<{ title: string; url: string; content: string; score: number }>
    responseTime: number
  }
}

/** 文件上传 API 响应 */
export interface UploadFileResponse {
  fileId: string
  originalName: string
  mimeType: string
  size: number
}

/** 注册请求体 */
export interface RegisterBody {
  username: string
  password: string
}

/** 登录请求体 */
export interface LoginBody {
  username: string
  password: string
}

/** JWT Payload */
export interface JwtPayload {
  userId: string
  username: string
}

/** 认证响应（登录/注册成功后返回） */
export interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
  }
  /** 用户的聊天记录索引列表（按更新时间倒序），登录时一并返回减少请求次数 */
  conversations: Conversation[]
}

/** 模型校验请求体 */
export interface ValidateModelBody {
  model: string
}

/** 模型校验响应 */
export interface ValidateModelResponse {
  valid: boolean
  model?: string
  error?: string
  suggestion?: string
}

/** 创建定时任务请求体 */
export interface CreateTaskBody {
  title: string
  prompt: string
  frequencyType: 'once' | 'daily' | 'weekly' | 'monthly'
  time: string
  dayOfWeek?: number
  dayOfMonth?: number
  expiresAt?: string
  /** 是否开启深度思考 */
  deepThink?: number
  /** 是否开启联网搜索 */
  webSearch?: number
}

/** 更新定时任务请求体 */
export interface UpdateTaskBody {
  title?: string
  prompt?: string
  frequencyType?: 'once' | 'daily' | 'weekly' | 'monthly'
  time?: string
  dayOfWeek?: number
  dayOfMonth?: number
  enabled?: number
  expiresAt?: string | null
  /** 是否开启深度思考 */
  deepThink?: number
  /** 是否开启联网搜索 */
  webSearch?: number
}
