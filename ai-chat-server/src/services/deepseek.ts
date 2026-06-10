/**
 * src/services/deepseek.ts —— DeepSeek API 代理服务
 *
 * 封装对 DeepSeek API 的调用，支持：
 * - 非流式请求（chat）
 * - SSE 流式请求（chatStream），支持思考模式（reasoning_content）
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
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export interface ChatOptions {
  messages: ChatMessage[]
  model?: string
  signal?: AbortSignal
  thinking?: ThinkingConfig
}

export async function chat(options: ChatOptions): Promise<string> {
  const { messages, model = 'deepseek-chat', signal, thinking } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: false }
  if (thinking?.type === 'enabled') {
    params.extra_body = { thinking }
  }
  const response = await client.chat.completions.create(params as any, { signal }) as any
  return response.choices[0]?.message?.content ?? ''
}

export async function* chatStream(
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { messages, model = 'deepseek-chat', signal, thinking } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: true }
  const exposeThinking = thinking?.type === 'enabled'
  if (exposeThinking) {
    params.extra_body = { thinking }
  }
  const stream = await client.chat.completions.create(params as any, { signal }) as any

  let reasoningActive = false

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as any

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
      if (reasoningActive) {
        reasoningActive = false
      }
      yield { content: delta.content, done: false, type: 'answer' }
    }
  }

  yield { content: '', done: true, type: 'answer' }
}
