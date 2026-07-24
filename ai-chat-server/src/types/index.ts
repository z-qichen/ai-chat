/**
 * src/types/index.ts —— 全局类型定义
 *
 * 定义后端使用的所有 TypeScript 接口/类型，
 * 与前端 src/types/index.ts 保持一致的数据模型。
 */

/** 对话中的单条消息 */
export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** 附件文件列表（JSON 字符串） */
  files?: string | null
  /** 深度思考内容（仅 assistant 消息，开启思考模式时产生） */
  reasoningContent?: string | null
  /** 是否为截断消息（用户停止生成时标记，继续生成后清除） */
  partial?: boolean
}

/** 一个完整的对话会话 */
export interface Conversation {
  id: string
  userId: string
  title: string
  model: string
  createdAt: number
  updatedAt: number
}

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

/** AI 消息内容部分（多模态） */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

/** 聊天消息内容：纯文本或多模态 */
export type ChatMessageContent = string | ContentPart[]

/** 流式请求体（扩展支持文件引用） */
export interface StreamRequestWithFiles {
  model?: string
  fileIds?: string[]
  thinking?: ThinkingConfig
}

/** SSE 流式 chunk */
export interface StreamChunk {
  content: string
  done: boolean
  /** chunk 类型：thinking=思考过程，answer=最终回答，memories_added=记忆提取完成 */
  type?: 'thinking' | 'answer' | 'memories_added'
  /** AI 调用的工具列表（extract_user_info 等） */
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string } }>
  /** 记忆提取完成时携带新增的记忆数量 */
  memoriesAdded?: number
  /** 流结束时携带后端持久化的 assistant 消息真实 ID（用于前端回填本地乐观消息 ID） */
  messageId?: string
  /** 是否被用户中断 */
  aborted?: boolean
}

/** 用户记忆条目 */
export interface MemoryItem {
  id: string
  userId: string
  category: 'identity' | 'address' | 'preference' | 'background' | 'other'
  key: string
  value: string
  confidence: number
  source: 'auto' | 'manual'
  createdAt: number
  updatedAt: number
}

/** 记忆提取工具调用的参数 */
export interface ExtractMemoryArgs {
  category: MemoryItem['category']
  key: string
  value: string
  confidence: number
}

/** 上传的文件元数据 */
export interface UploadedFile {
  id: string
  userId: string
  originalName: string
  mimeType: string
  size: number
  storedPath: string
  extractedText?: string | null
  createdAt: number
}

/** 文件上传 API 响应 */
export interface UploadFileResponse {
  fileId: string
  originalName: string
  mimeType: string
  size: number
}

/** 用户 */
export interface User {
  id: string
  username: string
  passwordHash: string
  createdAt: number
}

/** JWT Payload */
export interface JwtPayload {
  userId: string
  username: string
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
