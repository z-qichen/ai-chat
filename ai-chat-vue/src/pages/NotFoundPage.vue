<script setup lang="ts">
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <el-icon class="not-found-icon" :size="72">
        <WarningFilled />
      </el-icon>

      <h1 class="not-found-code">404</h1>

      <p class="not-found-title">页面未找到</p>

      <p class="not-found-desc">您访问的页面不存在或已被移除</p>

      <div class="not-found-actions">
        <el-button type="primary" size="large" @click="goHome">
          返回首页
        </el-button>
        <el-button size="large" @click="router.go(-1)">
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
}

.not-found-content {
  text-align: center;
  user-select: none;
}

.not-found-icon {
  color: var(--accent-primary);
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

.not-found-code {
  font-size: 120px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
  letter-spacing: 8px;
  text-shadow: 0 0 60px rgba(99, 102, 241, 0.3),
               0 0 120px rgba(99, 102, 241, 0.1);
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 50%, #a78bfa 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

.not-found-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.not-found-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 40px;
}

.not-found-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
