<!--
  TaskPage.vue —— 定时任务页面

  职责：
    - 展示与管理定时任务（列表、创建/编辑/删除、开关、立即执行）

  设计参照 Kimi 定时任务风格：卡片列表 + 右侧弹窗创建/编辑 + 开关按钮
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { Clock, Plus } from '@element-plus/icons-vue'
import { useTaskStore } from '@/stores/task'
import { useConversationStore } from '@/stores/conversation'
import { FREQUENCY_LABELS } from '@/types'
import type { ScheduledTask } from '@/types'

const router = useRouter()
const store = useTaskStore()
const convStore = useConversationStore()

onMounted(() => {
  store.loadTasks()
})

// ---- 创建/编辑弹窗 ----
const dialogVisible = ref(false)
const dialogTitle = ref('创建定时任务')
const editingTask = ref<ScheduledTask | null>(null)

const form = ref({
  title: '',
  prompt: '',
  frequencyType: 'daily' as ScheduledTask['frequencyType'],
  time: '09:00',
  dayOfWeek: undefined as number | undefined,
  dayOfMonth: undefined as number | undefined,
  deepThink: false,
  webSearch: false,
})

const weekOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 0 },
]

function openCreate() {
  dialogTitle.value = '创建定时任务'
  editingTask.value = null
  form.value = {
    title: '',
    prompt: '',
    frequencyType: 'daily',
    time: '09:00',
    dayOfWeek: undefined,
    dayOfMonth: undefined,
    deepThink: false,
    webSearch: false,
  }
  dialogVisible.value = true
}

function openEdit(task: ScheduledTask) {
  dialogTitle.value = '编辑定时任务'
  editingTask.value = task
  form.value = {
    title: task.title,
    prompt: task.prompt,
    frequencyType: task.frequencyType,
    time: task.time,
    dayOfWeek: task.dayOfWeek ?? undefined,
    dayOfMonth: task.dayOfMonth ?? undefined,
    deepThink: task.deepThink === 1,
    webSearch: task.webSearch === 1,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.title.trim() || !form.value.prompt.trim()) {
    return
  }

  if (editingTask.value) {
    const ok = await store.updateTask(editingTask.value.id, {
      title: form.value.title,
      prompt: form.value.prompt,
      frequencyType: form.value.frequencyType,
      time: form.value.time,
      dayOfWeek: form.value.dayOfWeek ?? null,
      dayOfMonth: form.value.dayOfMonth ?? null,
      deepThink: form.value.deepThink ? 1 : 0,
      webSearch: form.value.webSearch ? 1 : 0,
    })
    if (ok) dialogVisible.value = false
  } else {
    const task = await store.createTask({
      title: form.value.title,
      prompt: form.value.prompt,
      frequencyType: form.value.frequencyType,
      time: form.value.time,
      dayOfWeek: form.value.dayOfWeek,
      dayOfMonth: form.value.dayOfMonth,
      deepThink: form.value.deepThink ? 1 : 0,
      webSearch: form.value.webSearch ? 1 : 0,
    })
    if (task) dialogVisible.value = false
  }
}

// ---- 任务操作 ----
async function handleToggle(task: ScheduledTask) {
  await store.toggleTask(task.id, !task.enabled)
}

async function handleRunNow(task: ScheduledTask) {
  const conversationId = await store.runTask(task.id)
  if (conversationId) {
    convStore.sessions.unshift({
      id: conversationId,
      title: task.title,
      updatedAt: Date.now(),
      messageCount: 2,
    })
    router.push({ name: 'chat-session', params: { id: conversationId } })
  }
}

async function handleDelete(task: ScheduledTask) {
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复，确定要删除该任务吗？',
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    await store.deleteTask(task.id)
  } catch { /* 取消 */ }
}

// ---- 格式化 ----
function formatNextRun(task: ScheduledTask): string {
  if (!task.enabled) return '已关闭'
  if (!task.nextRunAt) {
    if (task.frequencyType === 'once') return '执行后关闭'
    return '等待计算'
  }
  const d = new Date(task.nextRunAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `今天 ${time}`
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `明天 ${time}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`
}

function frequencyLabel(task: ScheduledTask): string {
  if (task.frequencyType === 'weekly' && task.dayOfWeek != null) {
    const opt = weekOptions.find(w => w.value === task.dayOfWeek)
    return opt ? `每${opt.label}` : '每周'
  }
  if (task.frequencyType === 'monthly' && task.dayOfMonth != null) {
    return `每月${task.dayOfMonth}日`
  }
  return FREQUENCY_LABELS[task.frequencyType]
}
</script>

<template>
  <div class="task-page">
    <!-- 页面头部 -->
    <div class="task-page__header">
      <div class="task-page__header-left">
        <h2 class="task-page__title">定时任务</h2>
        <span class="task-page__count">{{ store.tasks.length }} 个任务</span>
      </div>
      <button class="task-page__create-btn" @click="openCreate">
        <el-icon><Plus /></el-icon>
        <span>创建定时任务</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="store.loading" class="task-page__loading">
      <span>加载中...</span>
    </div>

    <!-- 任务列表 -->
    <div v-else-if="store.tasks.length > 0" class="task-page__list">
      <div
        v-for="task in store.tasks"
        :key="task.id"
        class="task-card"
        :class="{ 'task-card--disabled': !task.enabled }"
      >
        <div class="task-card__body">
          <div class="task-card__top">
            <h3 class="task-card__title">{{ task.title }}</h3>
            <div class="task-card__actions">
              <button
                class="task-card__action-btn"
                title="立即执行"
                @click.stop="handleRunNow(task)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
              <button
                class="task-card__action-btn"
                title="编辑"
                @click.stop="openEdit(task)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                class="task-card__action-btn task-card__action-btn--danger"
                title="删除"
                @click.stop="handleDelete(task)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>

          <p class="task-card__prompt">{{ task.prompt }}</p>

          <div class="task-card__meta">
            <span class="task-card__frequency">
              <el-icon :size="14"><Clock /></el-icon>
              {{ frequencyLabel(task) }}
            </span>
            <span class="task-card__next">
              下次执行: {{ formatNextRun(task) }}
            </span>
          </div>
        </div>

        <div class="task-card__switch">
          <el-switch
            :model-value="!!task.enabled"
            size="small"
            @change="handleToggle(task)"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="task-page__empty">
      <svg class="task-page__empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
      <p class="task-page__empty-text">暂无定时任务</p>
      <p class="task-page__empty-hint">点击上方按钮创建第一个定时任务，让 AI 按时自动执行</p>
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="task-form">
        <div class="task-form__item">
          <label class="task-form__label">任务标题</label>
          <el-input v-model="form.title" placeholder="例如：每日技术简报" maxlength="30" />
        </div>

        <div class="task-form__item">
          <label class="task-form__label">提示词</label>
          <el-input
            v-model="form.prompt"
            type="textarea"
            :rows="4"
            placeholder="输入需要 AI 执行的提示词..."
          />
        </div>

        <div class="task-form__row">
          <div class="task-form__item task-form__item--half">
            <label class="task-form__label">执行频率</label>
            <el-select v-model="form.frequencyType" style="width: 100%">
              <el-option label="每天" value="daily" />
              <el-option label="每周" value="weekly" />
              <el-option label="每月" value="monthly" />
              <el-option label="单次" value="once" />
            </el-select>
          </div>

          <div class="task-form__item task-form__item--half">
            <label class="task-form__label">执行时间</label>
            <el-time-picker
              v-model="form.time"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="选择时间"
              style="width: 100%"
            />
          </div>
        </div>

        <div class="task-form__item" v-if="form.frequencyType === 'weekly'">
          <label class="task-form__label">选择星期</label>
          <el-select v-model="form.dayOfWeek" placeholder="选择星期" style="width: 100%">
            <el-option
              v-for="opt in weekOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="task-form__item" v-if="form.frequencyType === 'monthly'">
          <label class="task-form__label">选择日期</label>
          <el-select v-model="form.dayOfMonth" placeholder="选择日期" style="width: 100%">
            <el-option
              v-for="d in 31"
              :key="d"
              :label="`${d}日`"
              :value="d"
            />
          </el-select>
        </div>

        <div class="task-form__item">
          <label class="task-form__label">高级选项</label>
          <div class="task-form__switches">
            <label class="task-form__switch-item">
              <el-switch v-model="form.deepThink" size="small" />
              <span>深度思考</span>
            </label>
            <label class="task-form__switch-item">
              <el-switch v-model="form.webSearch" size="small" />
              <span>联网搜索</span>
            </label>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">
          {{ editingTask ? '保存修改' : '创建任务' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="less">
.task-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 2rem 2.5rem;
  overflow-y: auto;
  background-color: var(--bg-primary);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  &__header-left {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }

  &__count {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  &__create-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background-color: var(--color-primary, #4f46e5);
    color: #fff;
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
      opacity: 0.85;
    }
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 4rem 0;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6rem 0;
    text-align: center;
  }

  &__empty-icon {
    color: var(--text-muted);
    opacity: 0.4;
    margin-bottom: 1rem;
  }

  &__empty-text {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0 0 0.5rem 0;
  }

  &__empty-hint {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin: 0;
  }
}

.task-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--color-primary, #4f46e5);
  }

  &--disabled {
    opacity: 0.55;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  &__action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;

    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-primary);
    }

    &--danger:hover {
      color: #e53e3e;
      background-color: rgba(229, 62, 62, 0.1);
    }
  }

  &__prompt {
    font-size: 0.8125rem;
    color: var(--text-secondary);
    margin: 0 0 0.75rem 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  &__frequency {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  &__switch {
    flex-shrink: 0;
    padding-top: 0.125rem;
  }
}

.task-form {
  &__item {
    margin-bottom: 1rem;
  }

  &__label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 0.375rem;
  }

  &__row {
    display: flex;
    gap: 1rem;
  }

  &__item--half {
    flex: 1;
  }

  &__switches {
    display: flex;
    gap: 1.5rem;
  }

  &__switch-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    cursor: pointer;
  }
}
</style>
