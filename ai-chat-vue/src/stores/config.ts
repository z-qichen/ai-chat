/**
 * stores/config.ts —— 应用配置状态管理
 *
 * 管理全局 AppConfig，包括 API Key、API Base、模型名称、系统提示词等。
 * 使用 Pinia Setup Store 风格，state 以 ref() 形式声明。
 *
 * 核心操作：
 *   updateConfig()  局部更新配置（合并模式）
 *   resetConfig()    恢复为默认值
 *   config           当前配置的响应式对象
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppConfig } from '@/types'

/** 默认配置（可通过设置页面修改） */
const DEFAULT_CONFIG: AppConfig = {
  model: 'deepseek-v4-pro',
  systemPrompt: '你是一个有用的AI助手。',
}

export const useConfigStore = defineStore('config', () => {
  // ---- State ----

  /** 当前应用配置（响应式） */
  const config = ref<AppConfig>({ ...DEFAULT_CONFIG })

  // ---- Actions ----

  /** 局部更新配置，只覆盖传入的字段，其余保留原值 */
  function updateConfig(partial: Partial<AppConfig>) {
    Object.assign(config.value, partial)
  }

  /** 重置配置为默认值 */
  function resetConfig() {
    config.value = { ...DEFAULT_CONFIG }
  }

  return {
    config,
    updateConfig,
    resetConfig,
  }
})
