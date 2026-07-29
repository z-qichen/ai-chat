/**
 * src/agents/builtin/default.ts —— 默认通用助手
 *
 * 系统内置的默认 Agent，具备当前平台所有基础能力：
 * 获取时间、数学计算、联网搜索。
 */
import type { AgentConfig } from '../types'

export const defaultAgent: AgentConfig = {
  id: 'default',
  name: '通用助手',
  description: '支持联网搜索、计算、获取时间的通用AI对话助手',
  systemPrompt:
    '你是一个有用的AI助手。当需要实时信息时请使用 web_search 工具搜索互联网；' +
    '当需要精确计算时使用 calculator 工具；获取当前时间请使用 get_current_time 工具。',
  icon: '🤖',
  type: 'builtin',
}
