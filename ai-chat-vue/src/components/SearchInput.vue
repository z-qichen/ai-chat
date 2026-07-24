<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'

const keyword = ref('')
</script>

<template>
  <div class="search-input">
    <el-icon class="search-input__icon"><Search /></el-icon>
    <el-input v-model="keyword" placeholder="搜索历史会话" />
  </div>
</template>

<style scoped lang="less">
.search-input {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  height: 2.75rem;
  border-radius: 0.625rem;
  background-color: var(--bg-secondary);
  transition: background-color 0.15s;

  &:focus-within {
    background-color: var(--bg-primary);
  }

  &__icon {
    font-size: 1rem;
    color: var(--text-placeholder);
    flex-shrink: 0;
  }

  :deep(.el-input__wrapper) {
    background: transparent;
    box-shadow: none !important;
    padding: 0;

    &.is-focus {
      box-shadow: none !important;
    }
  }

  :deep(.el-input__inner) {
    font-size: 0.8125rem;
    color: var(--text-primary);

    &::placeholder {
      color: var(--text-placeholder);
    }
  }
}
</style>
