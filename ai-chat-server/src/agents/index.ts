/**
 * src/agents/index.ts —— Agent 模块统一导出
 *
 * 对外暴露 Agent 类型、注册中心接口、内置 Agent 加载函数。
 *
 * 使用方式：
 *   1. 内置 Agent：import { registerBuiltinAgents } from './agents'
 *      在服务入口 index.ts 中调用一次即可。
 *
 *   2. 自定义 Agent：import { createAgent } from './agents'
 *      createAgent({ id: 'my-bot', name: '我的助手', description: '...', systemPrompt: '...' })
 *
 *   3. 扩展内置 Agent：在 builtin/ 下新增文件，在 builtin/index.ts 中注册。
 */
export type { AgentConfig, AgentSummary } from './types'
export {
  registerAgent,
  getAgent,
  listAgents,
  getAgentSystemPrompt,
  getAgentTools,
  createAgent,
} from './registry'
export { registerBuiltinAgents } from './builtin'

// Swarm 多Agent集群
export {
  runSwarm,
  swarmGraph,
  DEFAULT_SWARM_CONFIG,
} from './swarm'
export type {
  SubTask,
  WorkerResult,
  DecomposeOutput,
  SwarmStateShape,
  SwarmConfig,
} from './swarm'
