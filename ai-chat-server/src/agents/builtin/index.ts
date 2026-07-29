/**
 * src/agents/builtin/index.ts —— 内置 Agent 汇总
 *
 * 在此文件中注册所有平台内置的 Agent。
 * 新增内置 Agent 时，在此处 import 并调用 registerAgent 即可。
 */
import { registerAgent } from '../registry'
import { defaultAgent } from './default'

/** 注册所有内置 Agent（服务启动时调用一次） */
export function registerBuiltinAgents(): void {
  registerAgent(defaultAgent)

  // TODO: 在此处注册更多内置 Agent
  // registerAgent(codeReviewerAgent)
  // registerAgent(translatorAgent)
}
