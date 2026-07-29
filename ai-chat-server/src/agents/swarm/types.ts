/**
 * src/agents/swarm/types.ts —— Swarm 多Agent集群类型定义
 *
 * 定义任务拆解、Worker执行结果等核心数据结构。
 */
import type { ChatMessage } from '../../types/index'

/** 子任务 */
export interface SubTask {
  /** 唯一标识 */
  id: string
  /** Worker 角色名称（如"研究员"、"分析师"、"写手"） */
  workerRole: string
  /** 具体任务描述 */
  description: string
}

/** 单个 Worker 的执行结果 */
export interface WorkerResult {
  taskId: string
  workerRole: string
  content: string
}

/** 编排器拆解任务的 LLM 输出结构 */
export interface DecomposeOutput {
  plan: string
  subTasks: SubTask[]
}

/** Swarm 执行状态（对应 LangGraph state） */
export interface SwarmStateShape {
  messages: ChatMessage[]
  task: string
  plan: string
  subTasks: SubTask[]
  workerResults: WorkerResult[]
  finalOutput: string
  model: string
  error?: string
}

/** Swarm 运行配置 */
export interface SwarmConfig {
  /** 最大并行 Worker 数 */
  maxWorkers: number
  /** 使用的模型 */
  model: string
}

/** 默认 Swarm 配置 */
export const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  maxWorkers: 5,
  model: 'deepseek-v4-flash',
}
