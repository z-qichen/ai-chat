/**
 * stores/task.ts —— 定时任务状态管理
 *
 * 管理定时任务列表的加载、增删改查。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ScheduledTask } from '@/types'
import {
  fetchTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
  runScheduledTask,
} from '@/services/api'
import { ElMessage } from 'element-plus'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<ScheduledTask[]>([])
  const loading = ref(false)

  async function loadTasks() {
    loading.value = true
    try {
      tasks.value = await fetchTasks()
    } catch (err: any) {
      ElMessage.error('加载任务列表失败: ' + err.message)
    } finally {
      loading.value = false
    }
  }

  async function createTask(data: {
    title: string
    prompt: string
    frequencyType: string
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
    expiresAt?: string
    deepThink?: number
    webSearch?: number
  }): Promise<ScheduledTask | null> {
    try {
      const task = await createScheduledTask(data)
      tasks.value.unshift(task)
      ElMessage.success('创建成功')
      return task
    } catch (err: any) {
      ElMessage.error('创建失败: ' + err.message)
      return null
    }
  }

  async function updateTask(id: string, data: {
    title?: string
    prompt?: string
    frequencyType?: string
    time?: string
    dayOfWeek?: number | null
    dayOfMonth?: number | null
    deepThink?: number
    webSearch?: number
  }): Promise<boolean> {
    try {
      const updated = await updateScheduledTask(id, data)
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
      ElMessage.success('更新成功')
      return true
    } catch (err: any) {
      ElMessage.error('更新失败: ' + err.message)
      return false
    }
  }

  async function deleteTask(id: string): Promise<boolean> {
    try {
      await deleteScheduledTask(id)
      tasks.value = tasks.value.filter(t => t.id !== id)
      ElMessage.success('删除成功')
      return true
    } catch (err: any) {
      ElMessage.error('删除失败: ' + err.message)
      return false
    }
  }

  async function toggleTask(id: string, enabled: boolean): Promise<boolean> {
    try {
      const updated = await toggleScheduledTask(id, enabled ? 1 : 0)
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx !== -1) tasks.value[idx] = updated
      return true
    } catch (err: any) {
      ElMessage.error('操作失败: ' + err.message)
      return false
    }
  }

  async function runTask(id: string): Promise<string | null> {
    try {
      const { conversationId } = await runScheduledTask(id)
      return conversationId
    } catch (err: any) {
      ElMessage.error('执行失败: ' + err.message)
      return null
    }
  }

  return {
    tasks,
    loading,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    runTask,
  }
})
