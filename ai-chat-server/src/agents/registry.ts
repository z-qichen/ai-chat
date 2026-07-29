/**
 * src/agents/registry.ts —— Agent 注册中心
 *
 * 管理所有可用 Agent 的注册、查询与工具获取。
 * 内置 Agent 在服务启动时通过 registerBuiltinAgents() 自动加载，
 * 自定义 Agent 通过 registerAgent() 或 createAgent() 手动注册。
 */
import type { AgentConfig, AgentSummary } from './types'
import { logger } from '../logger'

const agentMap = new Map<string, AgentConfig>()

/** 注册一个 Agent */
export function registerAgent(config: AgentConfig): void {
  if (agentMap.has(config.id)) {
    logger.info(`Agent "${config.id}" 被重复注册，已覆盖`)
  }
  agentMap.set(config.id, config)
  logger.info(`Agent 已注册: ${config.id} (${config.type})`)
}

/** 根据 ID 获取 Agent 完整配置 */
export function getAgent(id: string): AgentConfig | undefined {
  return agentMap.get(id)
}

/** 列出所有 Agent（摘要信息） */
export function listAgents(): AgentSummary[] {
  return Array.from(agentMap.values()).map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.icon,
    type: a.type,
  }))
}

/** 获取指定 Agent 的系统提示词 */
export function getAgentSystemPrompt(id: string): string | undefined {
  return agentMap.get(id)?.systemPrompt
}

/** 获取指定 Agent 的专属工具集 */
export function getAgentTools(id: string) {
  return agentMap.get(id)?.tools ?? []
}

/** 快速创建并注册一个自定义 Agent */
export function createAgent(config: Omit<AgentConfig, 'type'>): AgentConfig {
  const agent: AgentConfig = { ...config, type: 'custom' }
  registerAgent(agent)
  return agent
}
