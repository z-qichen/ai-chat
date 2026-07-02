import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, SessionMeta } from '@/types'
import { login as apiLogin, register as apiRegister } from '@/services/api'
import { useConversationStore } from '@/stores/conversation'

const TOKEN_KEY = 'ai-chat-token'
const USER_KEY = 'ai-chat-user'

function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function removeUser() {
  localStorage.removeItem(USER_KEY)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(loadToken())
  const user = ref<User | null>(loadUser())
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => user.value?.username ?? '')

  function setAuth(t: string, u: User) {
    token.value = t
    user.value = u
    saveToken(t)
    saveUser(u)
    error.value = ''
  }

  function clearAuth() {
    token.value = null
    user.value = null
    removeToken()
    removeUser()
    localStorage.removeItem('ai-chat-sessions')
    error.value = ''
    // 清空 conversation store 内存状态，防止切换账号后残留旧数据
    const cs = useConversationStore()
    cs.sessions = []
    cs.messagesCache = {}
    cs.currentId = null
  }

  async function doLogin(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      const res = await apiLogin(username, password)
      setAuth(res.token, res.user)
      // 将后端返回的会话列表同步到 conversation store
      const conversationStore = useConversationStore()
      conversationStore.replaceSessions(res.conversations.map((c): SessionMeta => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
        messageCount: 0,
      })))
      return true
    } catch (e: any) {
      error.value = e.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  async function doRegister(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = ''
    try {
      await apiRegister(username, password)
      return true
    } catch (e: any) {
      error.value = e.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    clearAuth()
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    username,
    doLogin,
    doRegister,
    logout,
  }
})
