/**
 * src/agents/swarm/nodes.ts —— Swarm 图节点实现
 *
 * 三个核心节点：
 *   1. orchestratorNode — 用 LLM 拆解用户任务为子任务列表
 *   2. workerNode        — 各 Worker 独立执行分配到的子任务
 *   3. synthesizerNode   — 汇总所有 Worker 结果，生成最终答案
 */
import { chat } from '../../services/deepseek'
import { getMainToolDefinitions, getToolExecutor } from '../../services/tools'
import type { ChatMessage } from '../../types/index'
import type { ToolDefinition } from '../../types/index'
import type { SwarmStateShape, SubTask, WorkerResult, DecomposeOutput } from './types'
import { logger } from '../../logger'

// ==================== 编排器节点 ====================

const DECOMPOSE_SYSTEM_PROMPT = `你是一个任务拆解专家。给定用户的复杂任务，将其拆解为多个可并行的子任务，每个子任务分配给一个专业角色。

要求：
1. 子任务之间尽量独立，可并行执行
2. 每个子任务描述清晰具体，角色命名恰当
3. 子任务数量控制在 2~5 个
4. plan 字段简要说明拆解策略

输出必须是合法 JSON，格式如下：
{
  "plan": "拆解策略说明",
  "subTasks": [
    {
      "id": "task-1",
      "workerRole": "研究员",
      "description": "搜索并整理关于XXX的最新信息"
    }
  ]
}`

export async function orchestratorNode(state: SwarmStateShape): Promise<Partial<SwarmStateShape>> {
  logger.info('Swarm 编排器开始拆解任务', { task: state.task.slice(0, 100) })

  const systemMsg: ChatMessage = { role: 'system', content: DECOMPOSE_SYSTEM_PROMPT }
  const userMsg: ChatMessage = { role: 'user', content: `请拆解以下任务：\n\n${state.task}` }

  try {
    const result = await chat({
      messages: [systemMsg, userMsg],
      model: state.model,
    })

    let jsonStr = result.content.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```\w*\n?/g, '').replace(/```$/, '').trim()
    }

    const parsed: DecomposeOutput = JSON.parse(jsonStr)

    if (!parsed.subTasks?.length) {
      logger.info('Swarm 编排器：无需拆解，直接执行')
      return {
        plan: '任务无需拆解，直接由单个Worker执行',
        subTasks: [{ id: 'direct', workerRole: '执行者', description: state.task }],
      }
    }

    logger.info('Swarm 编排器拆解完成', {
      plan: parsed.plan.slice(0, 80),
      subTaskCount: parsed.subTasks.length,
    })

    return {
      plan: parsed.plan,
      subTasks: parsed.subTasks.slice(0, 5),
    }
  } catch (err: any) {
    logger.error('Swarm 编排器拆解失败', err)
    return {
      error: `任务拆解失败: ${err.message}`,
      plan: '拆解失败，降级为单Worker执行',
      subTasks: [{ id: 'fallback', workerRole: '执行者', description: state.task }],
    }
  }
}

// ==================== Worker 节点 ====================

async function buildWorkerPrompt(role: string, task: string): Promise<ChatMessage> {
  return {
    role: 'system',
    content: `你是「${role}」，一个专业领域的AI助手。请根据你的专业角度完成以下任务。如果需要实时信息，请使用工具搜索互联网；需要计算请使用计算器工具。`,
  }
}

export async function workerNode(state: SwarmStateShape & { currentSubTask: SubTask }): Promise<Partial<SwarmStateShape>> {
  const { currentSubTask } = state
  logger.info(`Swarm Worker [${currentSubTask.workerRole}] 开始执行`, {
    taskId: currentSubTask.id,
    description: currentSubTask.description.slice(0, 80),
  })

  const systemMsg = await buildWorkerPrompt(currentSubTask.workerRole, currentSubTask.description)
  const userMsg: ChatMessage = { role: 'user', content: currentSubTask.description }

  try {
    // Worker 也走 Agent Loop（最多3轮 tool calling）
    const tools = getMainToolDefinitions({ includeSearch: true })
    const agentMessages: ChatMessage[] = [systemMsg, userMsg]

    for (let round = 0; round < 3; round++) {
      const result = await chat({
        messages: agentMessages,
        model: state.model,
        tools,
      })

      if (result.toolCalls.length === 0) break

      agentMessages.push({
        role: 'assistant',
        content: null,
        tool_calls: result.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      })

      for (const tc of result.toolCalls) {
        const executor = getToolExecutor(tc.function.name)
        let toolOutput: string
        try {
          if (!executor) {
            toolOutput = `未知工具: ${tc.function.name}`
          } else {
            const raw = await executor.execute(tc.function.arguments)
            if (tc.function.name === 'web_search') {
              const parsed = JSON.parse(raw)
              toolOutput = parsed.llmText ?? JSON.stringify(parsed)
            } else {
              toolOutput = raw
            }
          }
        } catch (err: any) {
          toolOutput = `工具执行错误: ${err.message}`
        }

        agentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: toolOutput,
        })
      }
    }

    // 最终总结
    agentMessages.push({
      role: 'user',
      content: '请基于以上信息，给出你的专业结论（简洁直接，不要问后续问题）。',
    })

    const finalResult = await chat({ messages: agentMessages, model: state.model })

    logger.info(`Swarm Worker [${currentSubTask.workerRole}] 完成`, {
      taskId: currentSubTask.id,
      outputLength: finalResult.content.length,
    })

    return {
      workerResults: [{
        taskId: currentSubTask.id,
        workerRole: currentSubTask.workerRole,
        content: finalResult.content,
      }],
      messages: [
        { role: 'user', content: currentSubTask.description },
        { role: 'assistant', content: finalResult.content },
      ],
    }
  } catch (err: any) {
    logger.error(`Swarm Worker [${currentSubTask.workerRole}] 执行失败`, err)
    return {
      workerResults: [{
        taskId: currentSubTask.id,
        workerRole: currentSubTask.workerRole,
        content: `执行失败: ${err.message}`,
      }],
      messages: [],
    }
  }
}

// ==================== 合成器节点 ====================

export async function synthesizerNode(state: SwarmStateShape): Promise<Partial<SwarmStateShape>> {
  logger.info('Swarm 合成器开始汇总', { workerCount: state.workerResults.length })

  if (state.workerResults.length === 0) {
    return { finalOutput: '所有Worker均未返回结果。' }
  }

  if (state.workerResults.length === 1) {
    return { finalOutput: state.workerResults[0].content }
  }

  const workerSummaries = state.workerResults.map(wr =>
    `### ${wr.workerRole}（子任务 ${wr.taskId}）\n${wr.content}`
  ).join('\n\n---\n\n')

  const systemMsg: ChatMessage = {
    role: 'system',
    content: `你是结果汇总专家。多个专业Agent并行处理了同一个任务的各个方面，请综合他们的成果，生成一份完整、连贯的最终答案。

要求：
1. 去重合并：不同Agent可能提到相同信息，只保留一次
2. 逻辑整合：将各Agent的发现按逻辑顺序组织
3. 冲突处理：如有矛盾观点，客观列出各方论据
4. 直接回答用户问题，不要说明"Agent A说了...Agent B说了..."
5. 使用 Markdown 格式增强可读性`,
  }

  const userMsg: ChatMessage = {
    role: 'user',
    content: `原始任务：${state.task}\n\n拆解策略：${state.plan}\n\n各Agent报告：\n\n${workerSummaries}\n\n请综合以上信息，给出最终答案。`,
  }

  try {
    const result = await chat({ messages: [systemMsg, userMsg], model: state.model })

    logger.info('Swarm 合成器完成', { outputLength: result.content.length })

    return { finalOutput: result.content }
  } catch (err: any) {
    logger.error('Swarm 合成器失败', err)
    return { finalOutput: `结果合成失败: ${err.message}\n\n原始报告：\n${workerSummaries}` }
  }
}
