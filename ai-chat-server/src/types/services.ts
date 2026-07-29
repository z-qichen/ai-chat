/**
 * types/services.ts —— 服务层内部类型
 *
 * 定义各服务模块使用的内部接口类型，
 * 不直接暴露给前端，仅供后端 services/ 目录下的模块使用。
 */

import type { ContentPart } from './domain'
import type { StreamChunk, ThinkingConfig } from './api'

// ===== 来自 services/chat.ts =====

/** 构建消息列表的输入参数 */
export interface BuildMessagesOptions {
  conversationId: string
  systemPrompt?: string
  userId?: string
  userName?: string
}

/** 发送给 LLM 的单条消息 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | ContentPart[] | null
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

/** 消息构建结果 */
export interface BuildMessagesResult {
  messages: ChatMessage[]
  tokenCount: number
  tokenLimit: number
  trimmedCount: number
}

// ===== 来自 services/deepseek.ts =====

/** OpenAI 工具定义 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** LLM 返回的工具调用结果 */
export interface ToolCallResult {
  id: string
  function: {
    name: string
    arguments: string
  }
}

/** 非流式聊天结果 */
export interface ChatResult {
  content: string
  toolCalls: ToolCallResult[]
}

/** 聊天请求选项 */
export interface ChatOptions {
  messages: ChatMessage[]
  model?: string
  signal?: AbortSignal
  thinking?: ThinkingConfig
  tools?: ToolDefinition[]
}

/** 流式聊天结果 */
export interface StreamResult {
  chunks: StreamChunk[]
  toolCalls: ToolCallResult[]
}

// ===== 来自 services/tools.ts =====

/** 工具执行器 */
export interface ToolExecutor {
  definition: ToolDefinition
  execute(args: string): Promise<string>
}

/** 工具选择选项 */
export interface ToolOptions {
  includeSearch?: boolean
}

// ===== 来自 services/file.ts =====

/** 文件处理后的内容 */
export interface ProcessedContent {
  textContent: string | null
  imageDataUrl: string | null
}

// ===== 来自 services/search.ts =====

/** Tavily 搜索结果单条 */
export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

/** Tavily API 响应 */
export interface TavilyResponse {
  answer?: string
  query: string
  results: TavilyResult[]
  response_time: number
}
