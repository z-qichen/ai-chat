/**
 * stores/theme.ts —— 主题状态管理
 *
 * 管理全局暗色/亮色模式切换，状态持久化到 localStorage。
 * 通过向 <html> 添加/移除 `dark` class 来控制主题。
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'ai-chat-theme'

export const useThemeStore = defineStore('theme', () => {
  /** 是否为暗色模式 */
  const isDark = ref(false)

  /** 从 localStorage 读取初始主题偏好 */
  function init() {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      isDark.value = stored === 'dark'
    } else {
      // 未存储时跟随系统偏好
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  /** 将主题应用到 DOM */
  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  /** 切换暗色/亮色模式 */
  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  return {
    isDark,
    init,
    toggle,
  }
})
