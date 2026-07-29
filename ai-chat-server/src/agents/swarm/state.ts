/**
 * src/agents/swarm/state.ts —— Swarm LangGraph 状态定义
 *
 * 使用 Annotation API 定义状态结构，支持字段级 reducer 合并。
 */
import { Annotation } from '@langchain/langgraph'
import type { ChatMessage } from '../../types/index'
import type { SubTask, WorkerResult } from './types'

export const SwarmAnnotation = Annotation.Root({
  /** 对话消息历史 */
  messages: Annotation<ChatMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  /** 用户原始任务 */
  task: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /** 编排计划（自然语言描述） */
  plan: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /** 拆解后的子任务列表 */
  subTasks: Annotation<SubTask[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  /** 各 Worker 执行结果（累加合并） */
  workerResults: Annotation<WorkerResult[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),

  /** 最终合成输出 */
  finalOutput: Annotation<string>({
    reducer: (_, update) => update,
    default: () => '',
  }),

  /** 模型名称 */
  model: Annotation<string>({
    reducer: (_, update) => update,
    default: () => 'deepseek-v4-flash',
  }),

  /** 错误信息 */
  error: Annotation<string | undefined>({
    reducer: (_, update) => update,
    default: () => undefined,
  }),
})
