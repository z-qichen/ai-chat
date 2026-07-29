/**
 * src/agents/swarm/graph.ts —— Swarm 状态图构建与编译
 *
 * 构建 LangGraph StateGraph，编排多Agent协作流程：
 *   START → orchestrator → [并行 Workers] → synthesizer → END
 *
 * 使用 Send API 实现动态并行扇出（fan-out）。
 */
import { StateGraph, START, END, Send } from '@langchain/langgraph'
import { SwarmAnnotation } from './state'
import { orchestratorNode, workerNode, synthesizerNode } from './nodes'
import type { SwarmStateShape, SwarmConfig } from './types'
import { DEFAULT_SWARM_CONFIG } from './types'
import { logger } from '../../logger'

// ==================== 路由逻辑 ====================

/** 编排完成后：如果有子任务则并行扇出到 Worker，否则直接合成 */
function routeAfterOrchestrator(state: SwarmStateShape): Array<Send | '__end__'> {
  if (state.error) {
    logger.info('Swarm 编排出错，跳过Worker直接合成')
    return ['__end__']
  }

  const tasks = state.subTasks
  if (tasks.length === 0) {
    return ['__end__']
  }

  logger.info(`Swarm 并行扇出 ${tasks.length} 个 Worker`, {
    workers: tasks.map(t => `${t.workerRole}(${t.id})`).join(', '),
  })

  return tasks.map(t => new Send('worker', { currentSubTask: t }))
}

// ==================== 构建图 ====================

const swarmGraph = new StateGraph(SwarmAnnotation)
  .addNode('orchestrator', orchestratorNode as any)
  .addNode('worker', workerNode as any)
  .addNode('synthesizer', synthesizerNode as any)

  // 入口 → 编排器
  .addEdge(START, 'orchestrator')

  // 编排器 → 并行Worker（通过 Send 扇出）
  .addConditionalEdges('orchestrator', routeAfterOrchestrator as any, ['worker', '__end__'])

  // Worker 完成 → 合成器
  .addEdge('worker', 'synthesizer')

  // 合成器 → 结束
  .addEdge('synthesizer', END)

  .compile()

// ==================== 对外接口 ====================

/** 运行 Swarm 多Agent集群 */
export async function runSwarm(
  task: string,
  config?: Partial<SwarmConfig>,
): Promise<SwarmStateShape> {
  const mergedConfig = { ...DEFAULT_SWARM_CONFIG, ...config }

  logger.info('Swarm 集群启动', { task: task.slice(0, 100), model: mergedConfig.model })

  try {
    const result = await swarmGraph.invoke({
      task,
      model: mergedConfig.model,
      messages: [],
      plan: '',
      subTasks: [],
      workerResults: [],
      finalOutput: '',
    })

    logger.info('Swarm 集群完成', {
      workerCount: result.workerResults.length,
      outputLength: result.finalOutput.length,
    })

    return result as SwarmStateShape
  } catch (err: any) {
    logger.error('Swarm 集群执行失败', err)
    return {
      messages: [],
      task,
      plan: '',
      subTasks: [],
      workerResults: [],
      finalOutput: `Swarm执行失败: ${err.message}`,
      model: mergedConfig.model,
      error: err.message,
    }
  }
}

export { swarmGraph }
