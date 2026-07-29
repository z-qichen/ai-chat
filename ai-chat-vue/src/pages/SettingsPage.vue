<!--
  SettingsPage.vue —— 设置页面

  功能：
    - 系统提示词编辑（保存到后端，与数据库同步）
    - 模型选择
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import { getUserSettings, updateUserSettings } from '@/services/api'

const configStore = useConfigStore()

const systemPrompt = ref('')
const loading = ref(true)
const saving = ref(false)
const varHint1 = '{{user_name}}'
const varHint2 = '{{date}}'

async function loadSettings() {
  try {
    const res = await getUserSettings()
    if (res.systemPrompt) {
      systemPrompt.value = res.systemPrompt
      configStore.updateConfig({ systemPrompt: res.systemPrompt })
    } else {
      systemPrompt.value = configStore.config.systemPrompt
    }
  } catch {
    systemPrompt.value = configStore.config.systemPrompt
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await updateUserSettings(systemPrompt.value)
    configStore.updateConfig({ systemPrompt: systemPrompt.value })
    ElMessage.success('保存成功')
  } catch (err: any) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <h2>设置</h2>

    <div class="settings-section" v-loading="loading">
      <h3>系统提示词</h3>
      <p class="settings-hint">
        设置 AI 助手的默认行为。支持变量：<code>{{ varHint1 }}</code>（用户名）、<code>{{ varHint2 }}</code>（当前日期）
      </p>
      <el-input
        v-model="systemPrompt"
        type="textarea"
        :rows="6"
        placeholder="输入系统提示词..."
      />
      <div class="settings-actions">
        <el-button type="primary" @click="saveSettings" :loading="saving">保存</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 24px;
}

.settings-page h2 {
  margin-bottom: 24px;
  font-size: 20px;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  margin-bottom: 8px;
  font-size: 16px;
}

.settings-hint {
  color: #909399;
  font-size: 13px;
  margin-bottom: 12px;
}

.settings-hint code {
  background: #f0f2f5;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.settings-actions {
  margin-top: 12px;
}
</style>
