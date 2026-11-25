<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Bell, Message, CaretBottom } from '@element-plus/icons-vue'
import { avatarColor, avatarText } from '@/utils/avatar'
import { authStateRO } from '@/stores/auth'
import { logout } from '@/api/auth'
import { getUnreadCount } from '@/api/notification'
import { pmUnreadTotal, pmBootstrap, pmReset, pmRefreshUnread } from '@/stores/pm'
import FeedbackDialog from '@/components/FeedbackDialog.vue'

const route = useRoute()
const router = useRouter()

const navItems = [
  { label: '首页', path: '/' },
  { label: '游戏攻略', path: '/game' },
  { label: '影视攻略', path: '/movie' },
  { label: 'AI聊天', path: '/ai' },
]

const keyword = ref('')
const feedbackVisible = ref(false)
const unreadCount = ref(0)
let unreadTimer = null
let pmUnreadTimer = null

// 当前登录用户（来自 auth store，响应式）
const displayName = computed(
  () => authStateRO.userInfo?.nickname || authStateRO.userInfo?.username || '莓友'
)

async function refreshUnread() {
  try {
    const data = await getUnreadCount()
    unreadCount.value = data.count ?? 0
  } catch {
    // 静默失败
  }
}

function goNotifications() {
  router.push('/notifications')
}

function goMessages() {
  router.push('/messages')
}

onMounted(() => {
  if (authStateRO.userInfo?.id) {
    refreshUnread()
    unreadTimer = setInterval(refreshUnread, 60_000) // 每 60s 轮询一次
    // 私信：建连 WebSocket + 拉取未读，每 60s 兜底刷新一次（WebSocket 实时为主）
    pmBootstrap()
    pmRefreshUnread()
    pmUnreadTimer = setInterval(pmRefreshUnread, 60_000)
  }
})

// token 变化（登录 / 刷新 / 登出）时重连或清理私信连接
watch(
  () => authStateRO.token,
  (token) => {
    if (token) {
      pmBootstrap()
      pmRefreshUnread()
    } else {
      pmReset()
    }
  }
)

onBeforeUnmount(() => {
  if (unreadTimer) clearInterval(unreadTimer)
  if (pmUnreadTimer) clearInterval(pmUnreadTimer)
  pmReset()
})

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function onSearch() {
  // 在游戏/影视攻略页搜索时留在当前页，其他页面回到首页
  const q = keyword.value.trim()
  const base = ['/game', '/movie'].includes(route.path) ? route.path : '/'
  router.push({ path: base, query: q ? { q } : {} })
}

async function handleCommand(cmd) {
  if (cmd === 'profile' || cmd === 'favorites') {
    router.push(`/${cmd}`)
    return
  }
  if (cmd === 'feedback') {
    feedbackVisible.value = true
    return
  }
  if (cmd !== 'logout') return
  try {
    await ElMessageBox.confirm('确定退出登录吗？', '提示', { type: 'warning' })
    await logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    /* 用户取消 */
  }
}
</script>

<template>
  <div class="layout">
    <header class="header">
      <div class="header-inner">
        <div class="brand" @click="router.push('/')">
          <img src="/images/logo.jpg" alt="logo" class="logo" />
          <span class="brand-name">莓攻略</span>
        </div>

        <nav class="nav-menu">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >{{ item.label }}</router-link>
        </nav>

        <div class="header-right">
          <el-input
            v-model="keyword"
            placeholder="搜索游戏 / 影视 / 攻略"
            class="search-input"
            :prefix-icon="Search"
            clearable
            @keyup.enter="onSearch"
          />
          <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="icon-btn" @click="goNotifications">
            <el-icon :size="20"><Bell /></el-icon>
          </el-badge>
          <el-badge :value="pmUnreadTotal" :hidden="pmUnreadTotal === 0" class="icon-btn" @click="goMessages">
            <el-icon :size="20"><Message /></el-icon>
          </el-badge>

          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-area">
              <el-avatar :size="30" :style="{ background: avatarColor(displayName) }">
                {{ avatarText(displayName) }}
              </el-avatar>
              <span class="user-name">{{ displayName }}</span>
              <el-icon><CaretBottom /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="favorites">我的收藏</el-dropdown-item>
                <el-dropdown-item command="feedback">用户反馈</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </header>

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="footer">
      <p>莓攻略 Strawberry Guild · 游戏 / 影视攻略应有尽有 · AI 姬陪你聊</p>
    </footer>

    <FeedbackDialog v-model="feedbackVisible" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f4f5f7;
}
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid #eceff1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex-shrink: 0;
}
.logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  object-fit: cover;
}
.brand-name {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #5b8def, #9b59b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.nav-menu {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.nav-item {
  position: relative;
  padding: 0 14px;
  height: 60px;
  line-height: 60px;
  font-size: 15px;
  color: #4e5969;
  text-decoration: none;
  transition: color 0.2s;
}
.nav-item:hover {
  color: #5b8def;
}
.nav-item.active {
  color: #5b8def;
  font-weight: 600;
}
.nav-item.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 3px;
  background: #5b8def;
  border-radius: 3px 3px 0 0;
}
.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.search-input {
  width: 240px;
}
.icon-btn {
  color: #4e5969;
  cursor: pointer;
  transition: color 0.2s;
}
.icon-btn:hover {
  color: #5b8def;
}
.user-area {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}
.user-area:hover {
  background: #f2f3f5;
}
.user-name {
  font-size: 14px;
  color: #4e5969;
}
.main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 16px 20px;
}
.footer {
  text-align: center;
  padding: 24px;
  color: #8a919f;
  font-size: 13px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
