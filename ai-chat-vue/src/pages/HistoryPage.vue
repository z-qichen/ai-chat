<!--
  HistoryPage.vue —— 历史会话页

  职责：
    - 展示所有历史会话，按日期分组（本日 / 昨日 / 更早）
    - 虚拟滚动优化（可变高度：分组标题 + 卡片）
    - 滚动到底部自动加载更多（分页）
    - 与 Sidebar 共享 conversation store 中的会话数据
    - 支持多选与批量删除

  数据流：
    - 从 useConversationStore().sessions 读取会话列表
    - 首次进入若无数据则触发 store.loadMoreSessions() 初始加载
    - 滚动到底部触发 store.loadMoreSessions() 追加数据
    - store 作为 Sidebar 和 HistoryPage 之间的共享缓存
-->
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
import SearchInput from '@/components/SearchInput.vue'
import historyCard from '@/components/historyCard.vue'
import { useConversationStore } from '@/stores/conversation'
import type { SessionMeta } from '@/types'

const store = useConversationStore()

// ======== 虚拟滚动参数 ========
const SECTION_HEADER_HEIGHT = 48
const CARD_HEIGHT = 104
const BUFFER = 3
const LOAD_MORE_THRESHOLD = 400

const scrollContainer = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

// ======== 按日期分组 ========
interface DateGroup {
  label: string
  sessions: SessionMeta[]
}

const groupedSessions = computed<DateGroup[]>(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  const groupMap = new Map<string, SessionMeta[]>()

  for (const s of store.sessions) {
    const d = new Date(s.updatedAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    let key: string
    if (dayStart >= todayStart) {
      key = '本日'
    } else if (dayStart >= yesterdayStart) {
      key = '昨日'
    } else {
      key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
    }
    const arr = groupMap.get(key)
    if (arr) {
      arr.push(s)
    } else {
      groupMap.set(key, [s])
    }
  }

  return [...groupMap.entries()].map(([label, sessions]) => ({ label, sessions }))
})

// ======== 展平为虚拟项列表 ========
type VirtualItem =
  | { type: 'header'; label: string }
  | { type: 'card'; session: SessionMeta }

const flatItems = computed<VirtualItem[]>(() => {
  const items: VirtualItem[] = []
  for (const group of groupedSessions.value) {
    items.push({ type: 'header', label: group.label })
    for (const session of group.sessions) {
      items.push({ type: 'card', session })
    }
  }
  return items
})

function getItemHeight(item: VirtualItem): number {
  return item.type === 'header' ? SECTION_HEADER_HEIGHT : CARD_HEIGHT
}

/** 每一项的顶部偏移量 */
const itemOffsets = computed(() => {
  const offsets: number[] = []
  let acc = 0
  for (const item of flatItems.value) {
    offsets.push(acc)
    acc += getItemHeight(item)
  }
  return offsets
})

const totalHeight = computed(() => {
  const items = flatItems.value
  if (items.length === 0) return 0
  return itemOffsets.value[items.length - 1] + getItemHeight(items[items.length - 1])
})

/** 二分查找 offset 对应的 item 索引 */
function findStartIndex(targetOffset: number): number {
  const offsets = itemOffsets.value
  let lo = 0
  let hi = offsets.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (offsets[mid] < targetOffset) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return Math.max(0, lo - 1)
}

const visibleRange = computed(() => {
  const start = Math.max(0, findStartIndex(scrollTop.value) - BUFFER)
  let end = start
  const threshold = scrollTop.value + containerHeight.value
  while (end < flatItems.value.length && itemOffsets.value[end] < threshold) {
    end++
  }
  end = Math.min(flatItems.value.length, end + BUFFER)
  return { start, end }
})

const visibleItems = computed(() =>
  flatItems.value.slice(visibleRange.value.start, visibleRange.value.end)
)

const offsetY = computed(() => itemOffsets.value[visibleRange.value.start] ?? 0)

// ======== 滚动事件：更新 scrollTop + 触底加载更多 ========
function onScroll() {
  const el = scrollContainer.value
  if (!el) return
  scrollTop.value = el.scrollTop
  if (el.scrollHeight - el.scrollTop - el.clientHeight < LOAD_MORE_THRESHOLD) {
    store.loadMoreSessions()
  }
}

onMounted(async () => {
  await nextTick()
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight
  }
  if (store.sessions.length === 0) {
    store.loadMoreSessions()
  }
})

// ======== 多选管理 ========
const selectedIds = ref<Set<string>>(new Set())

const selectedCount = computed(() => selectedIds.value.size)

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function isSelected(id: string): boolean {
  return selectedIds.value.has(id)
}

// ======== 置顶管理 ========
const pinnedIds = ref<Set<string>>(new Set())

function togglePin(id: string) {
  const next = new Set(pinnedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  pinnedIds.value = next
}

function isPinned(id: string): boolean {
  return pinnedIds.value.has(id)
}

// ======== 单条删除 ========
function deleteSingle(id: string) {
  ElMessageBox.confirm(
    '确定要删除该会话吗？删除后无法恢复。',
    '确认删除',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      store.deleteSession(id)
    })
    .catch(() => {})
}

// ======== 批量删除 ========
function batchDelete() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  ElMessageBox.confirm(
    `确定要删除选中的 ${ids.length} 个会话吗？删除后无法恢复。`,
    '确认删除',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      store.deleteSessions(ids)
      selectedIds.value = new Set()
    })
    .catch(() => {})
}

// ======== 格式化时间 ========
function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <div class="history-page">
    <div class="history-page__content">
      <h1 class="history-page__title">历史会话</h1>
      <div class="history-page__search">
        <SearchInput />
      </div>
      <div class="history-page__toolbar">
        <span class="history-page__toolbar-text">已选择 {{ selectedCount }} 个会话</span>
        <button
          class="history-page__toolbar-btn history-page__toolbar-btn--danger"
          :disabled="selectedCount === 0"
          @click="batchDelete"
        >
          删除
        </button>
      </div>

      <!-- 虚拟滚动区域 -->
      <div
        ref="scrollContainer"
        class="history-page__scroll"
        @scroll="onScroll"
      >
        <div
          class="history-page__scroll-spacer"
          :style="{ height: totalHeight + 'px' }"
        >
          <div
            class="history-page__scroll-content"
            :style="{ transform: `translateY(${offsetY}px)` }"
          >
            <template v-for="(item, index) in visibleItems" :key="index">
              <!-- 分组标题 -->
              <div
                v-if="item.type === 'header'"
                class="history-page__section-header"
              >
                {{ item.label }}
              </div>
              <!-- 会话卡片 -->
              <div v-else class="history-page__card-wrapper">
                <historyCard
                  :title="item.session.title"
                  :time="formatTime(item.session.updatedAt)"
                  :checked="isSelected(item.session.id)"
                  :pinned="isPinned(item.session.id)"
                  @update:checked="toggleSelect(item.session.id)"
                  @pin="togglePin(item.session.id)"
                  @delete="deleteSingle(item.session.id)"
                />
              </div>
            </template>
          </div>
        </div>
        <!-- 加载中提示 -->
        <div v-if="store.loadingSessions" class="history-page__loading">
          加载中...
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.history-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.history-page__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 2rem 1.5rem 0;
}

.history-page__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}

.history-page__search {
  max-width: 800px;
  width: 100%;
  margin: 0 auto 1rem;
  flex-shrink: 0;
}

.history-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 800px;
  width: 100%;
  margin: 0 auto 0.75rem;
  padding: 0 0.375rem;
  flex-shrink: 0;
}

.history-page__toolbar-text {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.history-page__toolbar-btn {
  font-size: 0.8125rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  color: var(--text-muted);
  transition: color 0.15s, background-color 0.15s;

  &:hover:not(:disabled) {
    background-color: var(--bg-alt);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--danger:hover:not(:disabled) {
    color: var(--danger);
    background-color: var(--danger-light);
  }
}

/* 虚拟滚动容器 */
.history-page__scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;

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
}

.history-page__scroll-spacer {
  position: relative;
}

.history-page__scroll-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.history-page__section-header {
  display: flex;
  align-items: flex-end;
  height: 48px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0 0.375rem 0.5rem;
  box-sizing: border-box;
}

.history-page__card-wrapper {
  height: 104px;
  display: flex;
  align-items: flex-start;
  padding-bottom: 0.5rem;
  box-sizing: border-box;
}

.history-page__loading {
  text-align: center;
  padding: 1rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .history-page__content {
    padding: 1.25rem 1rem 0;
  }
  .history-page__title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }
}
</style>
