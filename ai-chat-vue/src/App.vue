<!--
  App.vue —— Vue 应用根组件

  作为路由出口容器，所有页面内容由 <router-view /> 根据当前 URL 动态渲染。
  在挂载时初始化暗色模式主题（通过 Pinia themeStore.init()）。
-->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'

onMounted(() => {
  const theme = useThemeStore()
  theme.init()
})
</script>

<template>
  <router-view />
</template>
