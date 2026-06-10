<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">AI Chat</h1>
      <p class="login-subtitle">{{ isLogin ? '欢迎回来，请登录您的账号' : '创建账号，开始使用 AI Chat' }}</p>

      <!-- 登录表单 -->
      <el-form
        v-if="isLogin"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入账号"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            native-type="submit"
            :loading="auth.loading"
            class="submit-btn"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 注册表单 -->
      <el-form
        v-else
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
        @submit.prevent="handleRegister"
      >
        <el-form-item label="账号" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入账号"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            native-type="submit"
            :loading="auth.loading"
            class="submit-btn"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 切换 -->
      <div class="switch-row">
        <span>{{ isLogin ? '没有账号？' : '已有账号？' }}</span>
        <el-button link type="primary" @click="toggleMode">
          {{ isLogin ? '立即注册' : '返回登录' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isLogin = ref(true)

const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

const validateUsername = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请输入账号'))
  } else if (value.length < 3 || value.length > 20) {
    callback(new Error('账号长度应为3-20个字符'))
  } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    callback(new Error('账号仅支持字母、数字和下划线'))
  } else {
    callback()
  }
}

const validatePassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请输入密码'))
  } else if (value.length < 6 || value.length > 32) {
    callback(new Error('密码长度应为6-32个字符'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (_rule: any, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const loginRules: FormRules = {
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
}

const registerRules: FormRules = {
  username: [{ required: true, validator: validateUsername, trigger: 'blur' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  loginFormRef.value?.resetFields()
  registerFormRef.value?.resetFields()
}

const redirect = (route.query.redirect as string) || '/'

const handleLogin = () => {
  loginFormRef.value?.validate(async (valid) => {
    if (!valid) return
    const ok = await auth.doLogin(loginForm.username, loginForm.password)
    if (ok) {
      ElMessage.success('登录成功')
      router.push(redirect)
    } else {
      ElMessage.error(auth.error || '登录失败')
    }
  })
}

const handleRegister = () => {
  registerFormRef.value?.validate(async (valid) => {
    if (!valid) return
    const ok = await auth.doRegister(registerForm.username, registerForm.password)
    if (ok) {
      ElMessage.success('注册成功，请登录')
      toggleMode()
    } else {
      ElMessage.error(auth.error || '注册失败')
    }
  })
}
</script>

<style scoped lang="less">
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--login-bg-start) 0%, var(--login-bg-end) 100%);
}

.login-card {
  width: 420px;
  padding: 48px 40px 36px;
  border-radius: 12px;
  background-color: var(--bg-card);
  box-shadow: 0 8px 32px var(--login-card-shadow);
}

.login-title {
  margin: 0 0 8px;
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--login-title);
  letter-spacing: 0;
}

.login-subtitle {
  margin: 0 0 36px;
  text-align: center;
  font-size: 14px;
  color: var(--login-subtitle);
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 14px;
  color: var(--login-subtitle);
}
</style>
