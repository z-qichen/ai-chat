<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import { validateModel } from '@/services/api'

const configStore = useConfigStore()

/** 可用模型列表（展示用，实际校验由后端完成） */
const availableModels = [
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
]

/** 下拉菜单是否展开 */
const visible = ref(false)

/** 切换中状态 */
const switching = ref(false)

/** 当前选中模型的显示名称 */
const currentLabel = ref(
  availableModels.find((m) => m.value === configStore.config.model)?.label ?? configStore.config.model
)

/** 展开/收起下拉菜单 */
function toggle() {
  visible.value = !visible.value
}

/** 切换模型 */
async function select(modelValue: string, label: string) {
  if (switching.value) return
  visible.value = false

  switching.value = true
  try {
    const res = await validateModel(modelValue)
    if (res.valid) {
      configStore.updateConfig({ model: res.model })
      currentLabel.value = label
      ElMessage.success(`已切换至 ${label}`)
    } else {
      // 模型不合法，检查是否有近似建议
      if (res.suggestion) {
        try {
          await ElMessageBox.confirm(
            res.error || `模型 "${modelValue}" 不存在`,
            '模型校验失败',
            {
              confirmButtonText: `使用 "${res.suggestion}"`,
              cancelButtonText: '取消',
              type: 'warning',
            }
          )
          // 用户确认使用建议模型，递归调用校验
          const suggestedLabel =
            availableModels.find((m) => m.value === res.suggestion)?.label ?? res.suggestion
          switching.value = false
          select(res.suggestion!, suggestedLabel)
          return
        } catch {
          // 用户取消
        }
      } else {
        ElMessage.error(res.error || '模型校验失败')
      }
    }
  } catch (err: any) {
    ElMessage.error(err.message || '网络异常，请稍后重试')
  } finally {
    switching.value = false
  }
}

/** 点击外部关闭下拉菜单 */
function onBlur() {
  setTimeout(() => {
    visible.value = false
  }, 150)
}
</script>

<template>
  <div class="model-selector" @blur="onBlur" tabindex="0">
    <button
      class="model-selector__trigger"
      :class="{ 'model-selector__trigger--open': visible }"
      :disabled="switching"
      @click.stop="toggle"
    >
      <span class="model-selector__label">{{ switching ? '切换中...' : currentLabel }}</span>
      <svg
        class="model-selector__arrow"
        :class="{ 'model-selector__arrow--open': visible }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="14"
        height="14"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Transition name="dropdown">
      <div v-if="visible" class="model-selector__dropdown">
        <button
          v-for="m in availableModels"
          :key="m.value"
          class="model-selector__option"
          :class="{ 'model-selector__option--active': m.value === configStore.config.model }"
          @click="select(m.value, m.label)"
        >
          <span>{{ m.label }}</span>
          <span class="model-selector__option-id">{{ m.value }}</span>
          <svg
            v-if="m.value === configStore.config.model"
            class="model-selector__check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="16"
            height="16"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="less">
.model-selector {
  position: relative;
  outline: none;
}

.model-selector__trigger {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--border-primary);
  border-radius: 0.5rem;
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--border-secondary);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &--open {
    border-color: var(--accent-border);
    box-shadow: 0 0 0 2px var(--accent-shadow);
  }
}

.model-selector__label {
  white-space: nowrap;
}

.model-selector__arrow {
  color: var(--text-placeholder);
  transition: transform 0.2s;

  &--open {
    transform: rotate(180deg);
  }
}

.model-selector__dropdown {
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 50%;
  transform: translateX(-50%);
  min-width: 15rem;
  background: var(--bg-menu);
  border: 1px solid var(--border-primary);
  border-radius: 0.625rem;
  box-shadow: var(--shadow-lg);
  padding: 0.375rem;
  z-index: 100;
}

.model-selector__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;

  &:hover {
    background: var(--bg-hover);
  }

  &--active {
    background: var(--accent-light);
    color: var(--accent-hover);
  }
}

.model-selector__option-id {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--text-placeholder);
}

.model-selector__check {
  color: var(--accent-hover);
  flex-shrink: 0;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}
</style>
