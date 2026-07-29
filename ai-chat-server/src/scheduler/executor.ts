/**
 * src/scheduler/executor.ts —— 任务执行器
 *
 * 执行单个定时任务：创建对话 → 发送提示词 → 调用 LLM → 保存回复
 * 支持深度思考与联网搜索，逻辑复用 routes/chat.ts 的 Agent Loop。
 */
import { createConversation, updateConversation } from '../services/conversation'
import { createMessage } from '../services/message'
import { updateTaskRunInfo } from '../services/task'
import { chat } from '../services/deepseek'
import { buildMessages } from '../services/chat'
import { getUserSystemPrompt } from '../services/user'
import { getMainToolDefinitions, getToolExecutor } from '../services/tools'
import type { SearchToolOutput } from '../services/search'
import type { ScheduledTask, ChatMessage } from '../types/index'
import { logger } from '../logger'

export async function executeTask(task: ScheduledTask): Promise<string> {
  logger.info(`执行定时任务: ${task.title} (${task.id})`)

  const isThinking = task.deepThink === 1
  const isWebSearch = task.webSearch === 1
  const model = isThinking ? 'deepseek-v4-pro' : 'deepseek-v4-flash'

  // 1. 创建新对话（标记来自定时任务）
  const conversation = createConversation(
    task.userId,
    task.title,
    model,
    undefined,
    task.id
  )

  // 2. 保存用户消息（提示词）
  createMessage({
    conversationId: conversation.id,
    role: 'user',
    content: task.prompt,
    timestamp: Date.now(),
  })

  // 3. 构建消息并调用 LLM
  try {
    const systemPrompt = getUserSystemPrompt(task.userId) ?? undefined
    const result = await buildMessages({
      conversationId: conversation.id,
      userId: task.userId,
      systemPrompt,
    })

    const agentMessages: ChatMessage[] = [...result.messages]
    const accToolCalls: Array<{ name: string; args: string; result?: string; searchResults?: any; answer?: string; responseTime?: number }> = []
    const thinkingConfig = isThinking ? { type: 'enabled' as const } : { type: 'disabled' as const }
    const mainTools = getMainToolDefinitions({ includeSearch: isWebSearch })

    // ---- Phase 1: Agent Loop（非流式 tool calling）----
    if (isWebSearch) {
      const maxRounds = 5
      for (let round = 0; round < maxRounds; round++) {
        const chatResult = await chat({
          messages: agentMessages,
          model,
          tools: mainTools,
        })

        if (chatResult.toolCalls.length === 0) break

        agentMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: chatResult.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        })

        for (const tc of chatResult.toolCalls) {
          let toolOutput: string
          let searchData: any
          try {
            const executor = getToolExecutor(tc.function.name)
            if (!executor) {
              toolOutput = `未知工具: ${tc.function.name}`
            } else {
              const rawOutput = await executor.execute(tc.function.arguments)
              if (tc.function.name === 'web_search') {
                const parsed = JSON.parse(rawOutput) as SearchToolOutput
                toolOutput = parsed.llmText
                searchData = {
                  answer: parsed.answer,
                  results: parsed.results,
                  responseTime: parsed.responseTime,
                }
              } else {
                toolOutput = rawOutput
              }
            }
          } catch (err: any) {
            toolOutput = `工具执行错误: ${err.message || '未知错误'}`
          }

          accToolCalls.push({
            name: tc.function.name,
            args: tc.function.arguments,
            result: searchData ? '' : toolOutput,
            searchResults: searchData?.results,
            answer: searchData?.answer,
            responseTime: searchData?.responseTime,
          })

          agentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolOutput,
          })
        }
      }
    }

    // ---- Phase 2: 最终调用（带 thinking）----
    const { content } = await chat({
      messages: agentMessages,
      model,
      thinking: thinkingConfig,
    })

    // 4. 保存 AI 回复
    createMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content,
      timestamp: Date.now(),
      reasoningContent: null, // 非流式 chat() 暂不返回 reasoningContent
      toolCalls: accToolCalls.length > 0 ? accToolCalls : null,
    })

    // 5. 更新对话时间
    updateConversation(conversation.id, {})

    // 6. 更新任务执行记录
    updateTaskRunInfo(task.id, conversation.id)

    logger.info(`定时任务执行完成: ${task.title}, 对话ID: ${conversation.id}`)
  } catch (err: any) {
    logger.error(`定时任务执行失败: ${task.title}`, err)
    throw err
  }

  return conversation.id
}
