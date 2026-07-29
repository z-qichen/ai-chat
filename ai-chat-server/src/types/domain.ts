/**
 * types/domain.ts —— 核心领域模型
 *
 * 定义业务核心实体，包括消息、会话、用户、记忆、文件等，
 * 这些类型不依赖任何路由或服务层细节。
 */

/** AI 消息内容部分（多模态） */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }

/** 聊天消息内容：纯文本或多模态 */
export type ChatMessageContent = string | ContentPart[]

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
  /** 工具调用记录（仅 assistant 消息，Agent Loop 中产生的工具调用） */
  toolCalls?: Array<{
    name: string
    args: string
    result?: string
    searchResults?: Array<{ title: string; url: string; content: string; score: number }>
    answer?: string
    responseTime?: number
  }> | null
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
  /** 关联的定时任务 ID（由定时任务创建时有值） */
  fromTaskId?: string | null
}

/** 定时任务 */
export interface ScheduledTask {
  id: string
  userId: string
  title: string
  prompt: string
  frequencyType: 'once' | 'daily' | 'weekly' | 'monthly'
  time: string
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  nextRunAt?: string | null
  lastRunAt?: string | null
  enabled: number
  resultConversationId?: string | null
  expiresAt?: string | null
  /** 是否开启深度思考 (0/1) */
  deepThink: number
  /** 是否开启联网搜索 (0/1) */
  webSearch: number
  createdAt: number
  updatedAt: number
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

/** 用户 */
export interface User {
  id: string
  username: string
  passwordHash: string
  createdAt: number
  systemPrompt?: string | null
}
