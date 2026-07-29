/**
 * src/services/chat.ts —— 聊天消息构建服务
 *
 * 从数据库消息历史 + 文件内容构建 OpenAI 格式的消息数组。
 * 支持纯文本和多模态（图片 Vision）两种格式。
 *
 * 可被 chat/stream 路由及其他需要构建消息的地方复用。
 */
import { listAllMessages } from './message'
import { processFile } from './file'
import { injectMemoriesIntoSystemPrompt } from './memory'
import { getEncoding } from 'js-tiktoken'
import type { Message, ContentPart, BuildMessagesOptions, ChatMessage, BuildMessagesResult } from '../types/index'

const TOKEN_ENCODER = getEncoding('cl100k_base')
const MAX_CONTEXT_TOKENS = 60000

/** 默认系统提示词 */
const DEFAULT_SYSTEM_PROMPT = '你是一个有用的AI助手。'

/**
 * 替换系统提示词中的模板变量
 * - {{user_name}} → 用户名
 * - {{date}} → 当前日期（YYYY-MM-DD）
 */
function replaceVariables(prompt: string, userName?: string): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return prompt
    .replace(/\{\{user_name\}\}/g, userName || '')
    .replace(/\{\{date\}\}/g, dateStr)
}

function estimateTokenCount(messages: ChatMessage[]): number {
  let total = 0
  for (const msg of messages) {
    const content = msg.content
    if (typeof content === 'string') {
      total += TOKEN_ENCODER.encode(content).length
    } else if (Array.isArray(content)) {
      for (const part of content) {
        if (part.type === 'text') {
          total += TOKEN_ENCODER.encode(part.text).length
        } else if (part.type === 'image_url') {
          total += 85
        }
      }
    }
  }
  return total
}

function trimMessages(messages: ChatMessage[]): { messages: ChatMessage[]; trimmedCount: number } {
  const systemMsg = messages[0]
  let trimmedCount = 0

  while (true) {
    const tokens = estimateTokenCount(messages)
    if (tokens <= MAX_CONTEXT_TOKENS) break

    const nonSystemCount = messages.length - 1
    if (nonSystemCount <= 6) {
      if (messages.length > 3) {
        const last2 = messages.slice(-2)
        trimmedCount += messages.length - 3
        return { messages: [systemMsg, ...last2], trimmedCount }
      }
      break
    }

    messages.splice(1, 1)
    trimmedCount++
  }

  return { messages, trimmedCount }
}

export async function buildMessages(options: BuildMessagesOptions): Promise<BuildMessagesResult> {
  const { conversationId, systemPrompt = DEFAULT_SYSTEM_PROMPT, userId, userName } = options

  const processedPrompt = replaceVariables(systemPrompt, userName)

  const finalSystemPrompt = userId
    ? injectMemoriesIntoSystemPrompt(userId, processedPrompt)
    : processedPrompt

  const allMessages = listAllMessages(conversationId)

  const messages: ChatMessage[] = [
    { role: 'system', content: finalSystemPrompt },
  ]

  for (const msg of allMessages) {
    if (msg.role === 'system') continue

    const files = parseFilesField(msg.files)

    if (msg.role === 'user' && files.length > 0) {
      const parts = await buildUserContent(msg.content, files)

      if (parts.length === 1 && parts[0].type === 'text') {
        messages.push({ role: 'user', content: parts[0].text })
      } else {
        messages.push({ role: 'user', content: parts })
      }
    } else {
      messages.push({ role: msg.role, content: msg.content })
    }
  }

  const { messages: trimmedMessages, trimmedCount } = trimMessages(messages)
  const tokenCount = estimateTokenCount(trimmedMessages)

  return {
    messages: trimmedMessages,
    tokenCount,
    tokenLimit: MAX_CONTEXT_TOKENS,
    trimmedCount,
  }
}

async function buildUserContent(userText: string, fileIds: string[]): Promise<ContentPart[]> {
  const parts: ContentPart[] = []

  if (userText) {
    parts.push({ type: 'text', text: userText })
  }

  for (const fileId of fileIds) {
    const result = await processFile(fileId)
    if (result.imageDataUrl) {
      parts.push({
        type: 'image_url',
        image_url: { url: result.imageDataUrl },
      })
    }
    if (result.textContent) {
      const label = `[文件内容开始]\n${result.textContent}\n[文件内容结束]`
      parts.push({ type: 'text', text: label })
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: userText || '' })
  }

  return parts
}

function parseFilesField(files?: string | null): string[] {
  if (!files) return []
  try {
    const parsed = JSON.parse(files)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
