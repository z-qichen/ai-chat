<template>
    <div class="history-container">
        <div class="history-card-wrapper">
            <!-- 左侧圆形选中按钮（卡片外部） -->
            <div class="history-card__selector" :class="{ 'history-card__selector--checked': checked }"
                @click="emit('update:checked', !checked)">
                <svg v-if="checked" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>

            <!-- 右侧卡片内容区 -->
            <a href="" class="history-card">
                <div class="history-card__body">
                    <!-- 第一行：标题 + 编辑图标 + 留白 + 日期（默认） / 操作图标（hover） -->
                    <div class="history-card__row">
                        <span class="history-card__title">{{ title }}</span>
                        <span class="history-card__edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                        </span>
                        <span class="history-card__spacer"></span>
                        <span class="history-card__date">{{ time }}</span>
                        <span class="history-card__actions">
                            <span class="history-card__action history-card__action--pin" :class="{ 'history-card__action--pinned': pinned }" @click.prevent.stop="emit('pin')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="12" y1="17" x2="12" y2="22" />
                                    <path
                                        d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                                </svg>
                            </span>
                            <span class="history-card__action history-card__action--delete" @click.prevent.stop="emit('delete')">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path
                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </span>
                        </span>
                    </div>

                    <!-- 第二行：内容预览 -->
                     <div class="history-card__content">{{ content }}</div>
                </div>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  time?: string
  content?: string
  checked?: boolean
  pinned?: boolean
}>()

const emit = defineEmits<{
  'update:checked': [value: boolean]
  'pin': []
  'delete': []
}>()
</script>

<style scoped lang="less">
.history-container{
    margin: 0 auto;
    max-width: 800px;
    width: 100%;
}

/* 外层包装 */
.history-card-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

/* 圆形选中按钮（卡片外部左侧） */
.history-card__selector {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: calc((96px - 1.25rem) / 2);
    border-radius: 50%;
    border: 2px solid var(--border-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: transparent;
    transition: border-color 0.15s, background-color 0.15s, color 0.15s;

    &:hover {
        border-color: var(--accent-primary);
    }

    &--checked {
        background-color: var(--accent-primary);
        border-color: var(--accent-primary);
        color: #fff;

        &:hover {
            background-color: var(--accent-hover);
            border-color: var(--accent-hover);
        }
    }
}

/* 卡片主体 */
.history-card {
    flex: 1;
    min-width: 0;
    height: 96px;
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-radius: 0.625rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    text-decoration: none;
    color: inherit;
    transition: background-color 0.15s, border-color 0.15s;

    &:hover {
        background-color: var(--bg-hover);
        border-color: var(--border-secondary);
    }
}

.history-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
}

/* 第一行：标题 + 编辑 + 留白 + 图标 */
.history-card__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.history-card__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-card__edit {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 0.25rem;
    color: var(--text-placeholder);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, background-color 0.15s, color 0.15s;

    &:hover {
        background-color: var(--bg-alt);
        color: var(--text-secondary);
    }
}

.history-card:hover .history-card__edit {
    opacity: 1;
}

/* 留白（center），撑满剩余空间 */
.history-card__spacer {
    flex: 1;
    min-width: 0;
}

/* 操作图标 */
.history-card__action {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.375rem;
    color: var(--text-placeholder);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;

    &:hover {
        background-color: var(--bg-alt);
        color: var(--text-secondary);
    }

    &--delete:hover {
        background-color: var(--danger-light);
        color: var(--danger);
    }

    &--pinned {
        color: var(--accent-primary);
    }
}

/* 日期时间 */
.history-card__date {
    font-size: 0.75rem;
    color: var(--text-placeholder);
    flex-shrink: 0;
    white-space: nowrap;
    transition: opacity 0.15s;
}

/* 操作图标组：默认隐藏，hover 显示 */
.history-card__actions {
    display: none;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
}

.history-card:hover .history-card__date {
    display: none;
}

.history-card:hover .history-card__actions {
    display: flex;
}

/* 内容预览 */
.history-card__content {
    font-size: 0.8125rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.5;
}
</style>