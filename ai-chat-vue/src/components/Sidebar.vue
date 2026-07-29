<!--
  Sidebar.vue —— 侧边栏组件

  职责：
    - 展示会话列表（虚拟滚动优化，支持大量会话）
    - 新建会话按钮
    - 折叠/展开侧边栏
    - 会话标题内联编辑（双击或通过...菜单触发）
    - 用户信息栏（底部）

  虚拟滚动原理：
    - 固定每个会话项高度 ITEM_HEIGHT = 50px
    - 根据滚动位置计算可视区范围内的项索引（visibleRange）
    - 只渲染可见项 + 上下缓冲区（BUFFER）内的项
    - 通过 transform: translateY 定位可见项在虚拟列表中的位置

  事件通信（emit 到父组件 ChatPage）：
    toggle-sidebar → 切换侧边栏显示
    select-session  → 选中会话
    new-chat        → 新建会话
    update-title    → 更新会话标题
-->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

// ---- 事件定义 ----
const emit = defineEmits<{
  'toggle-sidebar': []
  'select-session': [id: string]
  'new-chat': []
  'update-title': [id: string, title: string]
  'delete-session': [id: string]
  'load-more-sessions': []
}>()

// ---- 本地接口（轻量，只含展示需要的字段） ----
interface Session {
  id: string
  title: string
  fromTaskId?: string | null
}

// ---- Props ----
const props = defineProps<{
  /** 父组件传入的会话列表 */
  sessions?: Session[]
  /** 当前选中的会话 ID */
  activeId?: string | null
}>()

/** 安全取值：props 未传时默认为空数组 */
const sessions = computed(() => props.sessions ?? [])

/** 用户菜单是否打开 */
const userMenuOpen = ref(false)

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
}

/** 会话列表是否展开 */
const chatListVisible = ref(true)

function toggleChatList() {
  chatListVisible.value = !chatListVisible.value
}

// ---- 虚拟滚动相关 ----
const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)       // 当前滚动偏移
const containerHeight = ref(0) // 可视区高度

/** 每个会话项的高度（px） */
const ITEM_HEIGHT = 50
/** 每个会话项的宽度（px） */
const ITEM_WIDTH = 255
/** 可视区外上下各多渲染的项数（缓冲，防止快速滚动时白屏） */
const BUFFER = 5

/** 虚拟列表总高度 = 项数 × 每项高度 */
const totalHeight = computed(() => sessions.value.length * ITEM_HEIGHT)

/** 可视区范围的起止索引 */
const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / ITEM_HEIGHT) - BUFFER)
  const end = Math.min(
    sessions.value.length,
    Math.ceil((scrollTop.value + containerHeight.value) / ITEM_HEIGHT) + BUFFER
  )
  return { start, end }
})

/** 可视区内的会话项（仅渲染这些） */
const visibleItems = computed(() => {
  return sessions.value.slice(visibleRange.value.start, visibleRange.value.end)
})

/** 可视区内容的 Y 轴偏移量 */
const offsetY = computed(() => visibleRange.value.start * ITEM_HEIGHT)

/** 滚动事件：更新 scrollTop，检测是否接近底部触发加载更多 */
const LOAD_MORE_THRESHOLD = 200
function onScroll() {
  if (scrollContainer.value) {
    scrollTop.value = scrollContainer.value.scrollTop
    const { scrollTop: st, scrollHeight, clientHeight } = scrollContainer.value
    if (scrollHeight - st - clientHeight < LOAD_MORE_THRESHOLD) {
      emit('load-more-sessions')
    }
  }
}

/** 容器大小变化：更新 containerHeight */
function onResize() {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
}

onMounted(() => {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
})

// ---- 事件处理 ----

/** 点击某个会话 → 通知父组件切换 */
function selectSession(id: string) {
  emit('select-session', id)
}

/** 点击新建按钮 → 通知父组件创建新会话 */
function onNewChat() {
  emit('new-chat')
}

// ---- 右键菜单 / 内联编辑 ----

/** 当前打开菜单的会话 ID（null 表示菜单关闭） */
const menuSessionId = ref<string | null>(null)
/** 当前正在编辑标题的会话 ID */
const editingId = ref<string | null>(null)
/** 编辑中的标题文本 */
const editingTitle = ref('')
/** 编辑输入框的 DOM 引用 */
let editInput: HTMLInputElement | null = null

/** 获取编辑输入框的 template ref */
function setEditRef(el: unknown) {
  editInput = el as HTMLInputElement | null
}

/** 切换 ... 菜单的展开/关闭 */
function toggleMenu(id: string, e: MouseEvent) {
  e.stopPropagation()
  menuSessionId.value = menuSessionId.value === id ? null : id
}

/** 关闭菜单 */
function closeMenu() {
  menuSessionId.value = null
}

/** 开始编辑标题（从菜单触发） */
function startEdit() {
  const id = menuSessionId.value
  if (!id) return
  const session = sessions.value.find((s) => s.id === id)
  if (!session) return
  editingTitle.value = session.title
  editingId.value = id
  menuSessionId.value = null // 关闭菜单
  // 等待 DOM 更新后聚焦并全选
  nextTick(() => {
    if (editInput) {
      editInput.focus()
      editInput.select()
    }
  })
}

/** 确认编辑：通知父组件更新标题 */
function confirmEdit() {
  if (editingId.value && editingTitle.value.trim()) {
    emit('update-title', editingId.value, editingTitle.value.trim())
  }
  editingId.value = null
  editingTitle.value = ''
}

/** 取消编辑（Esc 或失焦） */
function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
}

/** 删除会话：弹出确认框，确认后通知父组件 */
function deleteSession(id: string, e: MouseEvent) {
  e.stopPropagation()
  menuSessionId.value = null
  ElMessageBox.confirm(
    '删除后无法恢复，确定要删除该会话吗？',
    '确认删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      emit('delete-session', id)
    })
    .catch(() => { /* 用户取消 */ })
}

/** 编辑输入框键盘事件 */
function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    confirmEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}

/** 点击菜单外部时关闭菜单 */
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.session-card__menu') && !target.closest('.sidebar-user__menu')) {
    closeMenu()
    userMenuOpen.value = false
  }
}

/** 退出登录 */
function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

/** 路由跳转 */


</script>

<template>
  <div class="sidebar">
    <!-- 顶部区域：Logo + 折叠按钮 + 新建会话按钮 -->
    <div class="sidebar-header">
      <div class="sidebar-header__top">
        <span class="sidebar-header__logo">AI Chat</span>
        <!-- 折叠按钮 -->
        <button class="sidebar-header__collapse" @click="emit('toggle-sidebar')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
      </div>
      <!-- 新建会话按钮 -->
      <button class="sidebar-header__new-chat" @click="onNewChat">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>新建会话</span>
        <kbd>Ctrl+K</kbd>
      </button>
    </div>
   <!-- 任务分组 -->
    <div class="chatList-container">
      <div class="chatList-container-bread">
        <div class="chatList-container-bread__left" @click="toggleChatList">
          <span class="chatList-container-bread__arrow" :class="{ 'chatList-container-bread__arrow--open': chatListVisible }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
          <span>对话</span>
        </div>
        <div class="chatList-container-bread__right" @click="router.push({ name: 'history' })">查看全部</div>
      </div>
      <!-- 会话列表区域（虚拟滚动） -->
    <div
      v-show="chatListVisible"
      ref="scrollContainer"
      class="sidebar-scroll"
      @scroll="onScroll"
      @resize="onResize"
    >
      <!-- 虚拟列表占位容器（撑开滚动条） -->
      <div
        class="sidebar-scroll__spacer"
        :style="{ height: totalHeight + 'px' }"
      >
        <!-- 可视区内容（通过 translateY 定位） -->
        <div
          class="sidebar-scroll__content"
          :style="{ transform: `translateY(${offsetY}px)` }"
        >
          <!-- 循环渲染可见项 -->
          <div
            v-for="item in visibleItems"
            :key="item.id"
            :class="[
              'session-card',
              { 'session-card--active': props.activeId === item.id }
            ]"
            :style="{ width: ITEM_WIDTH + 'px', height: ITEM_HEIGHT + 'px' }"
            @click="selectSession(item.id)"
          >
            <!-- 会话图标 -->
            <span class="session-card__icon">
              <!-- 闹钟图标：定时任务创建的对话 -->
              <svg v-if="item.fromTaskId" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="13" r="8"/>
                <path d="M12 9v4l2.5 2.5"/>
                <path d="M4.5 5.5l-2-2"/>
                <path d="M19.5 5.5l2-2"/>
              </svg>
              <!-- 对话图标：普通对话 -->
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>

            <!-- 编辑模式：内联输入框 -->
            <input
              v-if="editingId === item.id"
              :ref="setEditRef"
              v-model="editingTitle"
              class="session-card__edit-input"
              @blur="confirmEdit"
              @keydown="onEditKeydown"
              @click.stop
            />
            <!-- 普通模式：显示标题 -->
            <span v-else class="session-card__title">{{ item.title }}</span>

            <!-- ... 更多操作 -->
            <div class="session-card__actions">
              <button
                class="session-card__more-btn"
                :class="{ 'session-card__more-btn--open': menuSessionId === item.id }"
                @click="toggleMenu(item.id, $event)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="19" cy="12" r="2"/>
                </svg>
              </button>

              <!-- 弹出菜单 -->
              <div v-if="menuSessionId === item.id" class="session-card__menu">
                <button class="session-card__menu-item" @click.stop="startEdit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <span>编辑标题</span>
                </button>
                <button class="session-card__menu-item session-card__menu-item--danger" @click.stop="deleteSession(item.id, $event)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  <span>删除会话</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    <!-- 定时任务按钮 -->
    <button class="sidebar-header__new-chat" @click="router.push('/task')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <span>定时任务</span>
    </button>
    <!-- 多Agent协作按钮 -->
    <button class="sidebar-header__new-chat" @click="router.push('/agents')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="8" cy="8" r="2"/>
        <circle cx="16" cy="8" r="2"/>
        <circle cx="12" cy="14" r="2"/>
        <line x1="9" y1="9.5" x2="11" y2="12.5"/>
        <line x1="15" y1="9.5" x2="13" y2="12.5"/>
      </svg>
      <span>多Agent协作</span>
    </button>
    <!-- 插件按钮 -->
    <button class="sidebar-header__new-chat" @click="router.push('/plugins')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4v-2a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-4 0v4H8a2 2 0 0 0-2 2v2H2v2a2 2 0 0 0 2 2h2v2a2 2 0 0 0 2 2h2v-4a2 2 0 0 1 4 0v4h2a2 2 0 0 0 2-2v-2h4z"/>
      </svg>
      <span>插件</span>
    </button>
    <!-- 底部操作区：主题切换 + 导航 + 用户信息 -->
    <div class="sidebar-footer">
      <button class="sidebar-footer__theme-btn" @click.stop="theme.toggle()" :title="theme.isDark ? '切换到亮色模式' : '切换到暗色模式'">
        <svg v-if="theme.isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      <button class="sidebar-footer__nav-btn" title="用户档案" @click="router.push('/memory')">
        <el-icon :size="16"><Document /></el-icon>
      </button>

      <div class="sidebar-user" @click.stop="toggleUserMenu">
      <div class="sidebar-user__avatar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <span class="sidebar-user__name">{{ auth.username || '用户名称' }}</span>
      <svg class="sidebar-user__arrow" :class="{ 'sidebar-user__arrow--open': userMenuOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>

      <div v-if="userMenuOpen" class="sidebar-user__menu">
        <button class="sidebar-user__menu-item sidebar-user__menu-item--danger" @click.stop="handleLogout">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>退出登录</span>
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped lang="less">
/* 侧边栏根容器 */
.sidebar {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-primary);
}

/* 头部区域 */
.sidebar-header {
  padding: 1rem 0.75rem 0.75rem;
  flex-shrink: 0;

  &__top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0 0.25rem;
  }

  &__logo {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  &__collapse {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: transparent;
    border-radius: 0.375rem;
    color: var(--text-placeholder);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-secondary);
    }
  }

  &__new-chat {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 255px;
    height: 2.5rem;
    padding: 0 0.75rem;
    margin: 0 auto;
    border: none;
    border-radius: 0.625rem;
    background-color: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
      background-color: var(--bg-alt);
    }

    kbd {
      margin-left: auto;
      padding: 0.125rem 0.375rem;
      font-size: 0.6875rem;
      font-family: inherit;
      color: var(--text-placeholder);
      background: var(--bg-alt);
      border-radius: 0.25rem;
    }
  }
}

/*任务分组 */
.chatList-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chatList-container-bread{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  user-select: none;
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: var(--text-secondary);

  &__left {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    padding: 0.25rem 0.375rem;
    margin: -0.25rem -0.375rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s;

    &:hover {
      background-color: var(--bg-hover);
    }
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s ease;
    flex-shrink: 0;

    &--open {
      transform: rotate(90deg);
    }
  }

  &__right {
    cursor: pointer;
    color: var(--text-placeholder);
    transition: color 0.15s;

    &:hover {
      color: var(--accent-primary);
    }
  }
}

/* 滚动区域 */
.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 0.25rem;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: var(--border-secondary);
    border-radius: 2px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }

  /* 虚拟列表：relative 定位容器 */
  &__spacer {
    position: relative;
  }

  /* 可视区内容：absolute 定位 */
  &__content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

/* 单个会话卡片 */
.session-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0 0.5rem 0 0.75rem;
  border-radius: 0.625rem;
  cursor: pointer;
  transition: background-color 0.15s;
  box-sizing: border-box;

  &:hover {
    background-color: var(--bg-hover);
  }

  /* 选中状态 */
  &--active {
    background-color: var(--bg-active);

    &:hover {
      background-color: var(--bg-active-hover);
    }
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.5rem;
    background-color: var(--bg-icon);
    color: var(--text-muted);
  }

  &--active &__icon {
    background-color: var(--bg-icon-active);
    color: var(--accent-primary);
  }

  &__title {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  &--active &__title {
    color: var(--accent-hover);
    font-weight: 500;
  }

  /* 内联编辑输入框 */
  &__edit-input {
    flex: 1;
    min-width: 0;
    height: 1.625rem;
    padding: 0 0.375rem;
    border: 1px solid var(--accent-primary);
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    background: var(--bg-primary);
    outline: none;
    box-sizing: border-box;
  }

  &__actions {
    position: relative;
    flex-shrink: 0;
  }

  /* ... 更多按钮（hover 时显示） */
  &__more-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.625rem;
    height: 1.625rem;
    border: none;
    background: transparent;
    border-radius: 0.375rem;
    color: var(--text-placeholder);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s, color 0.15s;

    &:hover,
    &--open {
      background-color: var(--bg-alt);
      color: var(--text-secondary);
    }

    &--open {
      opacity: 1;
    }
  }

  &:hover &__more-btn {
    opacity: 1;
  }

  /* 弹出菜单 */
  &__menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    padding: 0.25rem 0;
    background: var(--bg-menu);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-md);
    z-index: 100;
    min-width: 7.5rem;
  }

  &__menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s;

    &:hover {
      background-color: var(--bg-hover);
    }

    &--danger {
      color: var(--danger);

      &:hover {
        background-color: var(--danger-light);
      }
    }
  }
}

/* 底部操作区 */
.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0 0.25rem 0.25rem;
}

.sidebar-footer__theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-secondary);
  }
}

.sidebar-footer__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: transparent;
  border-radius: 0.5rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: var(--bg-hover);
    color: var(--text-secondary);
  }
}

/* 底部用户信息栏 */
.sidebar-user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  height: 3rem;
  padding: 0 0.75rem;
  border-radius: 0.625rem;
  cursor: pointer;
  transition: background-color 0.15s;
  flex-shrink: 0;

  &:hover {
    background-color: var(--bg-hover);
  }

  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background-color: var(--bg-icon);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  &__name {
    flex: 1;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--text-placeholder);
    transition: transform 0.2s;

    &--open {
      transform: rotate(180deg);
    }
  }

  &__menu {
    position: absolute;
    bottom: 100%;
    left: 1rem;
    right: 1rem;
    margin-bottom: 0.25rem;
    padding: 0.25rem 0;
    background: var(--bg-menu);
    border: 1px solid var(--border-primary);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-md);
    z-index: 100;
  }

  &__menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.1s;

    &:hover {
      background-color: var(--bg-hover);
    }

    &--danger {
      color: var(--danger);

      &:hover {
        background-color: var(--danger-light);
      }
    }
  }
}
</style>
