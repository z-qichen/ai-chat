/**
 * src/services/search.ts —— 联网搜索服务
 *
 * 封装 Tavily Search API，提供 AI 友好的网页搜索能力。
 * Tavily 自动完成搜索→抓取→清洗全流程，返回可直接注入 LLM 上下文的干净文本。
 *
 * 免费额度：1000 次/月，适合开发学习使用。
 * 文档：https://docs.tavily.com/docs/api-reference/endpoint/search
 */
import { config } from '../config'
import { logger } from '../logger'
import { Converter } from 'opencc-js'

/** 繁体转简体转换器（惰性初始化） */
let tw2cn: ((text: string) => string) | null = null
function getTw2Cn(): (text: string) => string {
  if (!tw2cn) {
    tw2cn = Converter({ from: 'tw', to: 'cn' })
  }
  return tw2cn
}

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

/** 搜索工具返回的 JSON 结构（execute 返回的字符串会 JSON.parse 为这个结构） */
export interface SearchToolOutput {
  /** 注入 LLM 上下文的精简文本 */
  llmText: string
  /** 透传给前端的结构化搜索结果 */
  results: TavilyResult[]
  /** AI 摘要（可选） */
  answer?: string
  /** 搜索耗时（秒） */
  responseTime: number
}

const TAVILY_URL = 'https://api.tavily.com/search'

/**
 * 联网搜索
 * @param query 搜索关键词（建议由 LLM 从用户消息中提炼，不超过 400 字符）
 * @param maxResults 最大返回结果数，默认 5
 */
export async function searchWeb(query: string, maxResults = 5): Promise<TavilyResponse> {
  if (!config.tavily.apiKey) {
    throw new Error('TAVILY_API_KEY 未配置，请在 .env 中设置')
  }

  logger.info('Tavily 搜索', { query: query.slice(0, 80), maxResults })

  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.tavily.apiKey,
      query,
      search_depth: 'basic',
      include_answer: true,
      max_results: maxResults,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    logger.error('Tavily API 错误', { status: res.status, body: errText.slice(0, 200) })
    throw new Error(`搜索失败 (${res.status}): ${errText.slice(0, 100)}`)
  }

  const data = await res.json() as TavilyResponse
  logger.info('Tavily 搜索结果', { resultCount: data.results.length, hasAnswer: !!data.answer })
  return data
}

/**
 * 清洗搜索结果 content 字段：
 * - 繁体字转简体字
 * - 去除营业/开放时间信息
 * - 去除用户评论噪声（旅游网站常见 | 开头的用户评价）
 * - 截断过长内容（默认 200 字）
 */
export function cleanContent(content: string, maxLength = 200): string {
  if (!content) return ''

  // 繁体转简体
  let cleaned = getTw2Cn()(content).trim()

  // 去除营业/开放时间信息（简体、繁体、日文汉字 + 英文）
  const timeKeywords = [
    '營業時間', '営業時間', '营业时间',
    '開放時間', '开放时间',
    'Opening Hours', 'Opening hours',
  ]
  for (const kw of timeKeywords) {
    cleaned = cleaned.replace(
      new RegExp(`[（(]?${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[：:][^。)）\n]*(?:[)）])?`, 'g'),
      '',
    )
  }

  // 去除用户评论噪声（旅游网站（如 Trip.com）以 | 开头嵌入的游客评价段落）
  // 常见模式：| 很大的景区... | 环境好... | 值得一去...
  cleaned = cleaned.replace(/\|\s*[^\n|]{10,}(?=\||$)/g, '')

  // 去除多余空白
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()

  // 截断过长内容
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + '...'
  }

  return cleaned
}

/**
 * 将 Tavily 搜索结果格式化为注入 LLM 上下文的精简文本
 */
export function formatSearchResultsForLLM(data: TavilyResponse): string {
  const lines: string[] = []

  if (data.answer) {
    lines.push(`【AI 摘要】${data.answer}`)
    lines.push('')
  }

  lines.push(`【搜索结果】共 ${data.results.length} 条，搜索耗时 ${data.response_time.toFixed(2)}s`)
  lines.push('')

  data.results.forEach((r, i) => {
    lines.push(`[${i + 1}] ${r.title}`)
    lines.push(`    链接: ${r.url}`)
    lines.push(`    摘要: ${r.content}`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * 将 Tavily 搜索结果格式化为 LLM 可读文本（旧接口兼容）
 * @deprecated 请使用 formatSearchResultsForLLM
 */
export function formatSearchResults(data: TavilyResponse): string {
  return formatSearchResultsForLLM(data)
}
