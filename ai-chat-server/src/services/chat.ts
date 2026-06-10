/**
 * src/services/chat.ts —— 聊天消息构建服务
 *
 * 从数据库消息历史 + 文件内容构建 OpenAI 格式的消息数组。
 * 支持纯文本和多模态（图片 Vision）两种格式。
 *
 * 可被 chat/stream 路由及其他需要构建消息的地方复用。
 */
import { listAllMessages } from './message.ts'
import { processFile } from './file.ts'
import type { Message, ContentPart } from '../types/index.ts'

export interface BuildMessagesOptions {
  conversationId: string
  systemPrompt?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ContentPart[]
}

export async function buildMessages(options: BuildMessagesOptions): Promise<ChatMessage[]> {
  const { conversationId, systemPrompt = '你是一个有用的AI助手。' } = options
  const allMessages = listAllMessages(conversationId)

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
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

  return messages
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
