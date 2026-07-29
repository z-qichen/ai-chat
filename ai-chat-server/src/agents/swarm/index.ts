/**
 * src/agents/swarm/index.ts —— Swarm 模块统一导出
 *
 * 对外暴露 Swarm 集群的所有接口。
 *
 * 使用方式：
 *   import { runSwarm } from './agents/swarm'
 *   const result = await runSwarm('对比分析 React 和 Vue 的生态系统')
 *   console.log(result.finalOutput)
 */
export type {
  SubTask,
  WorkerResult,
  DecomposeOutput,
  SwarmStateShape,
  SwarmConfig,
} from './types'

export { DEFAULT_SWARM_CONFIG } from './types'
export { SwarmAnnotation } from './state'
export { orchestratorNode, workerNode, synthesizerNode } from './nodes'
export { runSwarm, swarmGraph } from './graph'
