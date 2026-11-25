<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { authStateRO } from '@/stores/auth'
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/api/notification'

const router = useRouter()

const list = ref([])
const unreadCount = ref(0)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const marking = ref(false)

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`
  return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function typeLabel(type) {
  const map = {
    SYSTEM: '系统通知',
    COMMENT: '评论提醒',
    FOLLOW: '关注提醒',
    LIKE: '点赞提醒',
  }
  return map[type] || '其他'
}

function typeColor(type) {
  const map = {
    SYSTEM: 'primary',
    COMMENT: 'success',
    FOLLOW: 'warning',
    LIKE: 'danger',
  }
  return map[type] || 'info'
}

async function loadList(append = false) {
  if (loading.value) return
  loading.value = true
  try {
    const data = await getNotifications({ page: page.value, size: pageSize.value })
    list.value = append ? [...list.value, ...data.list] : data.list
    total.value = data.total ?? 0
    unreadCount.value = data.unread ?? 0
  } catch {
    // 保留旧数据
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  page.value = 1
  const [listRes, countRes] = await Promise.all([
    getNotifications({ page: 1, size: pageSize.value }),
    getUnreadCount(),
  ])
  list.value = listRes.list
  total.value = listRes.total ?? 0
  unreadCount.value = countRes.count ?? 0
}

async function handleRead(notification) {
  if (notification.isRead === 1) return
  try {
    await markNotificationRead(notification.id)
    notification.isRead = 1
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {
    // 保留原状态
  }
}

async function handleReadAll() {
  if (!unreadCount.value) return
  try {
    await markAllNotificationsRead()
    list.value.forEach((n) => (n.isRead = 1))
    unreadCount.value = 0
    ElMessage.success('已全部标记为已读')
  } catch {
    // 保留
  }
}

const hasMore = computed(() => list.value.length < total.value)

function loadMore() {
  if (loading.value || !hasMore.value) return
  page.value += 1
  loadList(true)
}

function goHome() {
  router.push('/')
}

onMounted(loadList)
</script>

<template>
  <div class="notifications-page">
    <div class="page-header">
      <div class="header-left">
        <h1><el-icon><Bell /></el-icon> 消息通知</h1>
        <p>{{ unreadCount > 0 ? `你有 ${unreadCount} 条未读通知` : '暂无未读通知' }}</p>
      </div>
      <div class="header-right">
        <el-button
          :disabled="!unreadCount"
          @click="handleReadAll"
        >全部标记已读</el-button>
        <el-button @click="refreshAll">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading" class="notif-list">
      <div
        v-for="item in list"
        :key="item.id"
        class="notif-item"
        :class="{ unread: item.isRead !== 1 }"
        @click="handleRead(item)"
      >
        <div class="notif-dot" v-if="item.isRead !== 1"></div>
        <el-tag
          :type="typeColor(item.type)"
          size="small"
          effect="light"
          class="notif-tag"
        >{{ typeLabel(item.type) }}</el-tag>
        <div class="notif-body">
          <div class="notif-title">{{ item.title }}</div>
          <div class="notif-content">{{ item.content }}</div>
          <div class="notif-time">{{ formatTime(item.created_at || item.createTime) }}</div>
        </div>
      </div>

      <el-empty
        v-if="!loading && !list.length"
        description="还没有收到通知"
      >
        <el-button type="primary" @click="goHome">去首页看看</el-button>
      </el-empty>

      <div v-if="hasMore && !loading && list.length" class="load-more">
        <el-button :loading="loading" @click="loadMore">加载更多</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 8px 0 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.header-left h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 22px;
  color: #1f2329;
}
.header-left h1 .el-icon {
  color: #5b8def;
}
.header-left p {
  margin: 0;
  color: #8a919f;
  font-size: 14px;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.notif-list {
  min-height: 300px;
}
.notif-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 10px;
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.notif-item:hover {
  background: #fafbfc;
}
.notif-item.unread {
  background: #f0f5ff;
}
.notif-dot {
  position: absolute;
  top: 18px;
  left: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
}
.notif-tag {
  flex-shrink: 0;
  margin-top: 2px;
}
.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 4px;
}
.notif-content {
  font-size: 14px;
  color: #4e5969;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.notif-time {
  margin-top: 8px;
  font-size: 12px;
  color: #a0a6b1;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
</style>
