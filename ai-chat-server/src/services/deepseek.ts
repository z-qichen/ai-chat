/**
 * src/services/deepseek.ts —— DeepSeek API 代理服务
 *
 * 封装对 DeepSeek API 的调用，支持：
 * - 非流式请求（chat），返回内容及可能的 tool_calls
 * - SSE 流式请求（chatStream），支持思考模式 + Tool Calling
 *
 * 通过后端代理调用，避免前端暴露 API Key。
 */
import OpenAI from 'openai'
import { config } from '../config.ts'
import type { StreamChunk, ContentPart, ThinkingConfig } from '../types/index.ts'

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseUrl,
})

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

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ToolCallResult {
  id: string
  function: {
    name: string
    arguments: string
  }
}

export interface ChatResult {
  content: string
  toolCalls: ToolCallResult[]
}

export interface ChatOptions {
  messages: ChatMessage[]
  model?: string
  signal?: AbortSignal
  thinking?: ThinkingConfig
  tools?: ToolDefinition[]
}

interface StreamAccumulator {
  content: string
  toolCalls: Map<number, { id: string; name: string; arguments: string }>
  hasToolCalls: boolean
}

export interface StreamResult {
  chunks: StreamChunk[]
  toolCalls: ToolCallResult[]
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const { messages, model = 'deepseek-chat', signal, thinking, tools } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: false }

  if (thinking?.type === 'enabled') {
    params.extra_body = { thinking }
  }
  if (tools?.length) {
    params.tools = tools
  }

  const response = await client.chat.completions.create(params as any, { signal }) as any
  const choice = response.choices[0]
  const content = choice?.message?.content ?? ''
  const rawToolCalls = choice?.message?.tool_calls ?? []

  const toolCalls: ToolCallResult[] = rawToolCalls.map((tc: any) => ({
    id: tc.id,
    function: {
      name: tc.function.name,
      arguments: tc.function.arguments,
    },
  }))

  return { content, toolCalls }
}

export async function* chatStream(
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { messages, model = 'deepseek-chat', signal, thinking, tools } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: true }
  const exposeThinking = thinking?.type === 'enabled'

  if (exposeThinking) {
    params.extra_body = { thinking }
  }
  if (tools?.length) {
    params.tools = tools
  }

  const stream = await client.chat.completions.create(params as any, { signal }) as any

  let reasoningActive = false
  const acc: StreamAccumulator = {
    content: '',
    toolCalls: new Map(),
    hasToolCalls: false,
  }
  /** 是否正在接收 tool_calls（此时不再向客户端推送 content） */
  let toolCallMode = false

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as any

    if (delta?.tool_calls) {
      if (!toolCallMode) {
        toolCallMode = true
        acc.hasToolCalls = true
      }
      for (const tc of delta.tool_calls) {
        const index: number = tc.index ?? 0
        if (!acc.toolCalls.has(index)) {
          acc.toolCalls.set(index, { id: tc.id ?? '', name: '', arguments: '' })
        }
        const entry = acc.toolCalls.get(index)!
        if (tc.id) entry.id = tc.id
        if (tc.function?.name) entry.name = tc.function.name
        if (tc.function?.arguments) entry.arguments += tc.function.arguments
      }
      continue
    }

    if (delta?.reasoning_content) {
      if (!reasoningActive) {
        reasoningActive = true
      }
      if (exposeThinking) {
        yield { content: delta.reasoning_content, done: false, type: 'thinking' }
      }
      continue
    }

    if (delta?.content) {
      if (reasoningActive) reasoningActive = false
      if (toolCallMode) {
        acc.content += delta.content
      } else {
        yield { content: delta.content, done: false, type: 'answer' }
      }
    }
  }

  if (acc.hasToolCalls) {
    const toolCalls: ToolCallResult[] = Array.from(acc.toolCalls.values())
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map(tc => ({
        id: tc.id,
        function: { name: tc.name, arguments: tc.arguments },
      }))
    yield {
      content: '',
      done: true,
      type: 'answer',
      toolCalls,
    }
    return
  }

  if (toolCallMode && acc.content) {
    yield { content: acc.content, done: false, type: 'answer' }
  }

  yield { content: '', done: true, type: 'answer' }
}
