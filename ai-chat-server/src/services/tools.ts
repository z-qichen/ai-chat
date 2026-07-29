/**
 * src/services/tools.ts —— 工具注册中心
 *
 * 定义主对话中 LLM 可调用的工具列表。
 * 每个工具包含 OpenAI 格式的定义（definition）和执行函数（execute）。
 *
 * 扩展方式：在 getMainTools() 中添加新的 ToolExecutor 即可。
 */
import type { ToolDefinition, ToolExecutor, ToolOptions } from '../types/index'
import { searchWeb, formatSearchResultsForLLM, cleanContent } from './search'
import type { SearchToolOutput } from './search'

const nowTool: ToolExecutor = {
  definition: {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前日期和时间',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  async execute(_args: string): Promise<string> {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  },
}

const calculatorTool: ToolExecutor = {
  definition: {
    type: 'function',
    function: {
      name: 'calculator',
      description: '计算数学表达式，支持加减乘除、括号等基本运算',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式，如 "2+3*4"、"sqrt(9)"、"pow(2,8)"',
          },
        },
        required: ['expression'],
      },
    },
  },
  async execute(args: string): Promise<string> {
    const { expression } = JSON.parse(args) as { expression?: string }
    if (!expression) throw new Error('缺少表达式参数')
    if (!/^[\d\s+\-*/().,%\w]+$/.test(expression)) {
      throw new Error(`表达式包含不允许的字符: ${expression}`)
    }
    const safeMath = {
      Math,
      sqrt: Math.sqrt,
      pow: Math.pow,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      round: Math.round,
      floor: Math.floor,
      ceil: Math.ceil,
      PI: Math.PI,
      E: Math.E,
    }
    try {
      const result = new Function(...Object.keys(safeMath), `return (${expression})`)(...Object.values(safeMath))
      return String(result)
    } catch {
      throw new Error(`无法计算表达式: ${expression}`)
    }
  },
}

const webSearchTool: ToolExecutor = {
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索互联网获取实时信息。当用户询问的问题需要最新数据、新闻、或超出你知识截止日期范围的内容时，应主动使用此工具。只需将用户问题的核心提炼为简洁的搜索关键词即可。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，从用户问题中提炼核心信息，使用简洁的关键词组合，不超过200字符',
          },
        },
        required: ['query'],
      },
    },
  },
  async execute(args: string): Promise<string> {
    const { query } = JSON.parse(args) as { query?: string }
    if (!query) throw new Error('缺少搜索关键词')
    const data = await searchWeb(query)
    const output: SearchToolOutput = {
      llmText: formatSearchResultsForLLM(data),
      results: data.results.map(r => ({ ...r, content: cleanContent(r.content) })),
      answer: data.answer,
      responseTime: data.response_time,
    }
    return JSON.stringify(output)
  },
}

const baseTools = [nowTool, calculatorTool]
const allTools = new Map<string, ToolExecutor>([
  [nowTool.definition.function.name, nowTool],
  [calculatorTool.definition.function.name, calculatorTool],
  [webSearchTool.definition.function.name, webSearchTool],
])

export function getMainTools(options?: ToolOptions): ToolExecutor[] {
  const tools = [...baseTools]
  if (options?.includeSearch) {
    tools.push(webSearchTool)
  }
  return tools
}

export function getMainToolDefinitions(options?: ToolOptions): ToolDefinition[] {
  return getMainTools(options).map(t => t.definition)
}

export function getToolExecutor(name: string): ToolExecutor | undefined {
  return allTools.get(name)
}
