/**
 * src/agents/types.ts —— Agent 类型定义
 *
 * 定义 Agent 配置结构与摘要信息。
 * Agent 是具备独立系统提示词和专属工具集的可对话实体。
 */
import type { ToolExecutor } from '../types/index'

/** Agent 完整配置 */
export interface AgentConfig {
  /** 唯一标识（如 'code-reviewer'、'translator'） */
  id: string
  /** 显示名称 */
  name: string
  /** 功能描述 */
  description: string
  /** 系统提示词（覆盖默认 system prompt） */
  systemPrompt?: string
  /** 该 Agent 专属的工具集 */
  tools?: ToolExecutor[]
  /** 图标（emoji 或 URL） */
  icon?: string
  /** Agent 来源 */
  type: 'builtin' | 'custom'
}

/** Agent 摘要（不含 tools，用于列表展示） */
export interface AgentSummary {
  id: string
  name: string
  description: string
  icon?: string
  type: 'builtin' | 'custom'
}
