/**
 * src/scheduler/index.ts —— 定时任务调度器
 *
 * 每分钟检查一次是否有到期的任务需要执行，
 * 到期任务按顺序逐个执行（避免并发调用 LLM API 导致限流）。
 */
import { getDueTasks } from '../services/task'
import { executeTask } from './executor'
import { logger } from '../logger'

let intervalId: ReturnType<typeof setInterval> | null = null

/** 启动调度器 */
export function startScheduler(): void {
  if (intervalId) return

  logger.info('定时任务调度器已启动，每分钟检查一次')

  intervalId = setInterval(async () => {
    try {
      const dueTasks = getDueTasks()
      if (dueTasks.length === 0) return

      logger.info(`发现 ${dueTasks.length} 个到期任务，开始执行`)

      for (const task of dueTasks) {
        try {
          await executeTask(task)
        } catch (err: any) {
          logger.error(`任务 ${task.title} 执行异常:`, err.message)
        }
      }
    } catch (err: any) {
      logger.error('调度器检查异常:', err.message)
    }
  }, 60_000)
}

/** 停止调度器 */
export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
    logger.info('定时任务调度器已停止')
  }
}
