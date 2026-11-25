<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Lock, Promotion, Message } from '@element-plus/icons-vue'
import { login, register, verifyIdentity, resetPassword } from '@/api/auth'
import { isLoggedIn } from '@/stores/auth'

const route = useRoute()
const router = useRouter()

const activeTab = ref('login') // login | register
const loading = ref(false)
const formRef = ref()

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  email: '',
  remember: true,
})

// 登录：账号支持用户名/邮箱，长度与后端 LoginRequest 一致
const loginRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 50, message: '账号长度 3-50 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码长度 6-100 位', trigger: 'blur' },
  ],
}

// 注册：字段与后端 RegisterRequest 一致
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度 3-20 位', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字、下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码长度 6-100 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
  nickname: [{ max: 30, message: '昵称不能超过 30 个字符', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
}

const rules = computed(() => (activeTab.value === 'login' ? loginRules : registerRules))

function validateConfirmPassword(rule, value, callback) {
  if (value !== form.password) callback(new Error('两次输入的密码不一致'))
  else callback()
}

onMounted(() => {
  if (isLoggedIn()) {
    router.replace('/')
  }
})

function redirectAfterLogin() {
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' && redirect ? redirect : '/')
}

async function handleLogin() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await login({ account: form.username, password: form.password })
    ElMessage.success('登录成功，欢迎回来～')
    redirectAfterLogin()
  } catch (e) {
    // 接口错误已由 request 拦截器统一提示
    if (!e?.handled) ElMessage.error(e.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await register({
      username: form.username,
      password: form.password,
      confirmPassword: form.confirmPassword,
      nickname: form.nickname || undefined,
      email: form.email || undefined,
    })
    ElMessage.success('注册成功，请登录')
    activeTab.value = 'login'
    form.password = ''
    form.confirmPassword = ''
    formRef.value?.clearValidate()
  } catch (e) {
    if (!e?.handled) ElMessage.error(e.message || '注册失败')
  } finally {
    loading.value = false
  }
}

async function handleTabChange(tab) {
  // 切换前确认是否丢弃已填内容
  if (hasInput() && tab !== activeTab.value) {
    try {
      await ElMessageBox.confirm('切换将清空当前已填内容，确定继续吗？', '提示', {
        type: 'warning',
      })
    } catch {
      return
    }
  }
  form.username = ''
  form.password = ''
  form.confirmPassword = ''
  form.nickname = ''
  form.email = ''
  activeTab.value = tab
  formRef.value?.clearValidate()
}

function hasInput() {
  return !!(form.username || form.password || form.confirmPassword || form.nickname || form.email)
}

// ==================== 忘记密码 ====================
const forgotVisible = ref(false)
const forgotStep = ref(1) // 1: 校验账号+邮箱  2: 设置新密码
const forgotLoading = ref(false)
const forgotFormRef = ref()
const forgotForm = reactive({
  username: '',
  email: '',
  newPassword: '',
  confirmPassword: '',
})

const forgotRules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 50, message: '账号长度 3-50 位', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入注册邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码长度 6-100 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: validateForgotConfirm, trigger: 'blur' },
  ],
}

function validateForgotConfirm(rule, value, callback) {
  if (value !== forgotForm.newPassword) callback(new Error('两次输入的密码不一致'))
  else callback()
}

function openForgot() {
  forgotStep.value = 1
  forgotForm.username = ''
  forgotForm.email = ''
  forgotForm.newPassword = ''
  forgotForm.confirmPassword = ''
  forgotVisible.value = true
  forgotFormRef.value?.clearValidate()
}

async function handleForgotVerify() {
  try {
    await forgotFormRef.value.validateField(['username', 'email'])
  } catch {
    return
  }
  forgotLoading.value = true
  try {
    await verifyIdentity({ username: forgotForm.username, email: forgotForm.email })
    ElMessage.success('验证通过，请设置新密码')
    forgotStep.value = 2
  } catch (e) {
    // 接口错误已由 request 拦截器统一提示
  } finally {
    forgotLoading.value = false
  }
}

async function handleForgotReset() {
  try {
    await forgotFormRef.value.validate()
  } catch {
    return
  }
  forgotLoading.value = true
  try {
    await resetPassword({
      username: forgotForm.username,
      email: forgotForm.email,
      newPassword: forgotForm.newPassword,
    })
    ElMessage.success('密码重置成功，请用新密码登录')
    forgotVisible.value = false
    activeTab.value = 'login'
  } catch (e) {
    // 接口错误已由 request 拦截器统一提示
  } finally {
    forgotLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 左侧品牌区 -->
      <div class="brand-panel">
        <div class="brand-logo">
          <img src="/images/logo.jpg" alt="logo" />
          <span>莓攻略</span>
        </div>
        <h1 class="brand-title">游戏 · 影视攻略应有尽有</h1>
        <p class="brand-desc">分享攻略、交流心得，还有 AI 姬随时陪你聊天 🍓</p>
        <ul class="brand-features">
          <li>🎮 海量游戏通关攻略</li>
          <li>🎬 影视剧情深度解析</li>
          <li>🤖 AI 姬在线答疑陪聊</li>
        </ul>
      </div>

      <!-- 右侧表单区 -->
      <div class="form-panel">
        <el-tabs v-model="activeTab" class="login-tabs" stretch @tab-change="handleTabChange">
          <el-tab-pane label="登录" name="login" />
          <el-tab-pane label="注册" name="register" />
        </el-tabs>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          @keyup.enter="activeTab === 'login' ? handleLogin() : handleRegister()"
        >
          <el-form-item :label="activeTab === 'login' ? '账号' : '用户名'" prop="username">
            <el-input
              v-model="form.username"
              :prefix-icon="User"
              :placeholder="activeTab === 'login' ? '用户名 / 邮箱' : '3-20 位字母、数字或下划线'"
              size="large"
              clearable
            />
          </el-form-item>

          <el-form-item v-if="activeTab === 'register'" label="昵称" prop="nickname">
            <el-input
              v-model="form.nickname"
              placeholder="昵称（可选，默认同用户名）"
              size="large"
              clearable
            />
          </el-form-item>

          <el-form-item v-if="activeTab === 'register'" label="邮箱" prop="email">
            <el-input
              v-model="form.email"
              :prefix-icon="Message"
              placeholder="邮箱（可选，用于找回账号）"
              size="large"
              clearable
            />
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              :prefix-icon="Lock"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
            />
          </el-form-item>

          <el-form-item v-if="activeTab === 'register'" label="确认密码" prop="confirmPassword">
            <el-input
              v-model="form.confirmPassword"
              :prefix-icon="Lock"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              show-password
            />
          </el-form-item>

          <div v-if="activeTab === 'login'" class="form-options">
            <el-checkbox v-model="form.remember">记住我</el-checkbox>
            <a class="link" @click="openForgot">忘记密码？</a>
          </div>

          <el-button
            type="primary"
            size="large"
            class="submit-btn"
            :loading="loading"
            :icon="Promotion"
            @click="activeTab === 'login' ? handleLogin() : handleRegister()"
          >
            {{ activeTab === 'login' ? '登 录' : '注 册' }}
          </el-button>
        </el-form>

        <div class="back-home">
          <a @click="router.push('/')">← 返回首页逛逛</a>
        </div>

        <!-- 忘记密码弹窗 -->
        <el-dialog
          v-model="forgotVisible"
          title="找回密码"
          width="420px"
          :close-on-click-modal="false"
          align-center
        >
          <el-form
            ref="forgotFormRef"
            :model="forgotForm"
            :rules="forgotRules"
            label-position="top"
            @keyup.enter="forgotStep === 1 ? handleForgotVerify() : handleForgotReset()"
          >
            <template v-if="forgotStep === 1">
              <p class="forgot-tip">请输入注册时的账号和邮箱，校验通过后即可重置密码。</p>
              <el-form-item label="账号" prop="username">
                <el-input
                  v-model="forgotForm.username"
                  :prefix-icon="User"
                  placeholder="请输入注册时的用户名"
                  clearable
                />
              </el-form-item>
              <el-form-item label="注册邮箱" prop="email">
                <el-input
                  v-model="forgotForm.email"
                  :prefix-icon="Message"
                  placeholder="请输入注册时填写的邮箱"
                  clearable
                />
              </el-form-item>
              <el-button
                type="primary"
                style="width: 100%"
                :loading="forgotLoading"
                @click="handleForgotVerify"
              >
                下一步
              </el-button>
            </template>
            <template v-else>
              <el-alert type="success" :closable="false" style="margin-bottom: 16px">
                验证通过，请设置新密码
              </el-alert>
              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="forgotForm.newPassword"
                  :prefix-icon="Lock"
                  type="password"
                  show-password
                  placeholder="6-100 位"
                />
              </el-form-item>
              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input
                  v-model="forgotForm.confirmPassword"
                  :prefix-icon="Lock"
                  type="password"
                  show-password
                  placeholder="请再次输入新密码"
                />
              </el-form-item>
              <el-button
                type="primary"
                style="width: 100%"
                :loading="forgotLoading"
                @click="handleForgotReset"
              >
                确认重置
              </el-button>
            </template>
          </el-form>
        </el-dialog>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forgot-tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: #8a919f;
  line-height: 1.6;
}
</style>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5b8def 0%, #9b59b6 100%);
  padding: 20px;
}
.login-card {
  width: 100%;
  max-width: 880px;
  min-height: 520px;
  background: #fff;
  border-radius: 18px;
  overflow: hidden;
  display: flex;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.brand-panel {
  flex: 1;
  background: linear-gradient(160deg, #5b8def 0%, #7c5cbf 60%, #9b59b6 100%);
  color: #fff;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 28px;
}
.brand-logo img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}
.brand-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  line-height: 1.3;
}
.brand-desc {
  font-size: 14px;
  opacity: 0.9;
  margin: 0 0 28px;
  line-height: 1.7;
}
.brand-features {
  list-style: none;
  padding: 0;
  margin: 0;
}
.brand-features li {
  font-size: 14px;
  padding: 8px 0;
  opacity: 0.92;
}
.form-panel {
  flex: 1;
  padding: 40px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.login-tabs :deep(.el-tabs__item) {
  font-size: 17px;
  font-weight: 600;
}
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: -4px 0 16px;
}
.link {
  font-size: 13px;
  color: #5b8def;
  cursor: pointer;
}
.link:hover {
  text-decoration: underline;
}
.submit-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  margin-top: 8px;
}
.back-home {
  margin-top: 14px;
  text-align: center;
  font-size: 13px;
}
.back-home a {
  color: #8a919f;
  cursor: pointer;
}
.back-home a:hover {
  color: #5b8def;
}
</style>
