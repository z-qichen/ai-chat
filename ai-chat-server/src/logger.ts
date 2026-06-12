/**
 * src/logger.ts —— 业务日志工具
 *
 * 将聊天请求/响应完整记录到后端根目录 api-responses.log，
 * 便于排查 SSE 流式对话是否正常返回内容。
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

const LOG_DIR = path.resolve(import.meta.dirname, '..')
const LOG_FILE = path.join(LOG_DIR, 'api-responses.log')

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 23)
}

function writeLine(text: string) {
  ensureDir()
  fs.appendFileSync(LOG_FILE, text + '\n', 'utf-8')
}

export const logger = {
  /** 请求开始 */
  request(label: string, detail?: Record<string, unknown>) {
    const extra = detail ? ' ' + JSON.stringify(detail) : ''
    writeLine(`[${timestamp()}] → ${label}${extra}`)
  },

  /** 正常信息 */
  info(label: string, detail?: Record<string, unknown>) {
    const extra = detail ? ' ' + JSON.stringify(detail) : ''
    writeLine(`[${timestamp()}]   ${label}${extra}`)
  },

  /** 流式 chunk */
  chunk(content: string, type?: string) {
    const preview = content.length > 120 ? content.slice(0, 120) + '…' : content
    const typeTag = type ? `[${type}]` : ''
    writeLine(`[${timestamp()}]   chunk${typeTag} ${preview}`)
  },

  /** 错误 */
  error(label: string, err?: unknown) {
    const msg = err instanceof Error ? err.message : String(err ?? '')
    writeLine(`[${timestamp()}] ✗ ${label} ${msg}`)
  },

  /** 响应结束 */
  end(label: string, detail?: Record<string, unknown>) {
    const extra = detail ? ' ' + JSON.stringify(detail) : ''
    writeLine(`[${timestamp()}] ← ${label}${extra}`)
  },

  /** 分隔线 */
  separator() {
    writeLine('─'.repeat(80))
  },
}
