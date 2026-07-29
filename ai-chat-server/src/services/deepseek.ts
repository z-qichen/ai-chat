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
import { config } from '../config'
import { logger } from '../logger'
import type { StreamChunk, ContentPart, ThinkingConfig, ChatMessage, ToolDefinition, ToolCallResult, ChatResult, ChatOptions, StreamResult } from '../types/index'

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetriableError(err: any): boolean {
  if (err.status === 429) return true
  if (err.status >= 500) return true
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') return true
  return false
}

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseUrl,
})

interface StreamAccumulator {
  content: string
  toolCalls: Map<number, { id: string; name: string; arguments: string; index: number }>
  hasToolCalls: boolean
}

export async function chat(options: ChatOptions): Promise<ChatResult> {
  const { messages, model = 'deepseek-v4-flash', signal, thinking, tools } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: false }

  if (thinking?.type === 'enabled') {
    params.extra_body = { thinking }
  }
  if (tools?.length) {
    params.tools = tools
  }

  const maxRetries = 3
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
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
    } catch (err: any) {
      lastError = err
      if (attempt < maxRetries && isRetriableError(err)) {
        const backoff = Math.pow(2, attempt) * 1000
        logger.info(`DeepSeek API 调用失败，${backoff / 1000}s 后重试 (${attempt + 1}/${maxRetries})`, {
          message: err.message,
          status: err.status,
          code: err.code,
        })
        await delay(backoff)
        continue
      }
      throw err
    }
  }

  throw lastError
}

export async function* chatStream(
  options: ChatOptions
): AsyncGenerator<StreamChunk> {
  const { messages, model = 'deepseek-v4-flash', signal, thinking, tools } = options
  const params: Record<string, any> = { model, messages: messages as any[], stream: true }
  const exposeThinking = thinking?.type === 'enabled'

  if (exposeThinking) {
    params.extra_body = { thinking }
  }
  if (tools?.length) {
    params.tools = tools
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  logger.request('DeepSeek API 调用', {
    model,
    thinking: exposeThinking,
    toolCount: tools?.length ?? 0,
    msgCount: messages.length,
    signalAborted: signal?.aborted ?? 'no-signal',
    lastUserMsg: typeof lastUserMsg?.content === 'string'
      ? (lastUserMsg.content as string).slice(0, 80)
      : '(非文本)',
  })

  let stream: any
  const maxRetries = 3
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (signal?.aborted) {
        logger.error('DeepSeek API 调用时 signal 已被提前中断')
        throw new Error('Signal already aborted before API call')
      }
      stream = await client.chat.completions.create(params as any, { signal }) as any
      break
    } catch (err: any) {
      lastError = err
      if (signal?.aborted) {
        logger.error('DeepSeek API 创建流失败（signal 已中断）', {
          message: err.message,
          status: err.status,
          code: err.code,
        })
        throw err
      }
      if (attempt < maxRetries && isRetriableError(err)) {
        const backoff = Math.pow(2, attempt) * 1000
        logger.info(`DeepSeek API 创建流失败，${backoff / 1000}s 后重试 (${attempt + 1}/${maxRetries})`, {
          message: err.message,
          status: err.status,
          code: err.code,
        })
        await delay(backoff)
        continue
      }
      logger.error('DeepSeek API 创建流失败', {
        message: err.message,
        status: err.status,
        code: err.code,
        type: err.type,
        name: err.name,
        stack: err.stack?.split('\n').slice(0, 3).join('\n'),
        headers: err.headers,
      })
      throw err
    }
  }

  if (!stream) throw lastError

  let reasoningActive = false
  const acc: StreamAccumulator = {
    content: '',
    toolCalls: new Map(),
    hasToolCalls: false,
  }
  /** 是否正在接收 tool_calls（此时不再向客户端推送 content） */
  let toolCallMode = false
  let chunkCount = 0

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta as any
    chunkCount++

    if (delta?.tool_calls) {
      if (!toolCallMode) {
        toolCallMode = true
        acc.hasToolCalls = true
        logger.info('检测到 tool_calls，进入工具调用模式')
      }
      for (const tc of delta.tool_calls) {
        const index: number = tc.index ?? 0
        if (!acc.toolCalls.has(index)) {
          acc.toolCalls.set(index, { id: tc.id ?? '', name: '', arguments: '', index })
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
        logger.info('开始接收 reasoning_content')
      }
      if (exposeThinking) {
        yield { content: delta.reasoning_content, done: false, type: 'thinking' }
      }
      continue
    }

    if (delta?.content) {
      if (reasoningActive) {
        reasoningActive = false
        logger.info('reasoning 结束，开始接收 content')
      }
      if (toolCallMode) {
        acc.content += delta.content
      } else {
        yield { content: delta.content, done: false, type: 'answer' }
      }
    }
  }

  logger.info('DeepSeek 流结束', { totalChunks: chunkCount, hasToolCalls: acc.hasToolCalls, toolCount: acc.toolCalls.size })

  if (acc.hasToolCalls) {
    const toolCalls: ToolCallResult[] = Array.from(acc.toolCalls.values())
      .sort((a, b) => a.index - b.index)
      .map(tc => ({
        id: tc.id,
        function: { name: tc.name, arguments: tc.arguments },
      }))
    logger.info('返回 tool_calls', { count: toolCalls.length, names: toolCalls.map(t => t.function.name) })
    yield {
      content: '',
      done: true,
      type: 'answer',
      toolCalls,
    }
    return
  }

  if (toolCallMode && acc.content) {
    logger.info('刷新工具调用期间累积的内容', { length: acc.content.length })
    yield { content: acc.content, done: false, type: 'answer' }
  }

  logger.end('DeepSeek API 调用完成', { answerChunks: chunkCount })
  yield { content: '', done: true, type: 'answer' }
}
