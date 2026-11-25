<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserById } from '@/api/user'
import { getUserPosts, toggleLike, toggleCollect } from '@/api/post'
import { toggleFollow } from '@/api/auth'
import { authStateRO } from '@/stores/auth'
import { pmEnsureConversation } from '@/stores/pm'
import { avatarColor, avatarText } from '@/utils/avatar'
import { normalizePost } from '@/composables/useHomeFeed'
import PostCard from '@/components/PostCard.vue'
import PostDetailDialog from '@/components/PostDetailDialog.vue'

const PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()

const userId = computed(() => route.params.id)
const currentUserId = computed(() => authStateRO.userInfo?.id)
const isSelf = computed(
  () => currentUserId.value != null && String(userId.value) === String(currentUserId.value)
)

const loading = ref(false)
const loadError = ref(false)
const user = ref({})
const following = ref(false)

const displayName = computed(() => user.value.nickname || user.value.username || '用户')
const joinedAt = computed(() => formatDate(user.value.createTime))

// 帖子列表
const posts = ref([])
const postsLoading = ref(false)
const postsError = ref(false)
const page = ref(1)
const hasMore = ref(false)
const loadingMore = ref(false)
const totalShown = computed(() => posts.value.length)

function formatDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('zh-CN')
}

async function loadUser() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getUserById(userId.value)
    user.value = data || {}
    // 关注态从帖子列表推断，初始先置 false
    following.value = false
  } catch {
    loadError.value = true
    user.value = {}
  } finally {
    loading.value = false
  }
}

async function fetchPosts(append = false) {
  if (append && (loadingMore.value || !hasMore.value)) return
  if (append) {
    loadingMore.value = true
  } else {
    postsLoading.value = true
    page.value = 1
  }
  postsError.value = false
  try {
    const data = await getUserPosts(userId.value, { page: page.value, size: PAGE_SIZE })
    const rawList = Array.isArray(data) ? data : []
    const list = rawList.map(normalizePost)
    if (!append && list.length) {
      following.value = !!list[0].following
    }
    hasMore.value = rawList.length === PAGE_SIZE
    posts.value = append ? [...posts.value, ...list] : list
  } catch {
    if (!append) {
      posts.value = []
      hasMore.value = false
      postsError.value = true
    }
  } finally {
    postsLoading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value += 1
  fetchPosts(true)
}

async function loadAll() {
  await Promise.all([loadUser(), fetchPosts()])
}

// 关注 / 取消关注
async function handleFollow() {
  const prev = following.value
  following.value = !prev
  // 同步列表里的关注态
  posts.value.forEach((p) => {
    p.following = following.value
  })
  try {
    const res = await toggleFollow(userId.value)
    if (res && typeof res.following === 'boolean') {
      following.value = res.following
      posts.value.forEach((p) => {
        p.following = res.following
      })
    }
    ElMessage.success(following.value ? '关注成功' : '已取消关注')
  } catch {
    following.value = prev
    posts.value.forEach((p) => {
      p.following = prev
    })
  }
}

// 发起私聊：先在本地创建会话，再跳转到消息页
function startChat() {
  pmEnsureConversation({
    id: user.value.id || userId.value,
    name: displayName.value,
    avatar: user.value.avatar || '',
  })
  router.push({ path: '/messages', query: { peer: String(userId.value) } })
}

// 帖子详情弹窗
const detailVisible = ref(false)
const currentPost = ref(null)

function openDetail(post) {
  currentPost.value = post
  detailVisible.value = true
}

function handleCommented({ postId, comments }) {
  const post = posts.value.find((p) => String(p.id) === String(postId))
  if (post) post.comments = comments
}

async function handlePostLike(id) {
  const post = posts.value.find((p) => String(p.id) === String(id))
  if (!post) return
  try {
    const result = await toggleLike(id)
    post.liked = result.liked
    post.likes = result.likeCount
  } catch {
    /* 保留原状态 */
  }
}

async function handlePostCollect(id) {
  const post = posts.value.find((p) => String(p.id) === String(id))
  if (!post) return
  try {
    const result = await toggleCollect(id)
    post.collected = result.collected
    post.collects = result.collectCount
  } catch {
    /* 保留原状态 */
  }
}

function handlePostFollow(authorId) {
  // 列表里的关注按钮，与主页按钮同步
  handleFollow()
}

watch(
  () => route.params.id,
  () => {
    posts.value = []
    loadAll()
  }
)

onMounted(loadAll)
</script>

<template>
  <div class="user-profile-page">
    <div v-loading="loading" class="profile-header">
      <div class="header-bg"></div>
      <div class="header-main">
        <el-avatar
          :size="76"
          :src="user.avatar || undefined"
          :style="{ background: avatarColor(displayName) }"
          class="user-avatar"
        >
          {{ avatarText(displayName) }}
        </el-avatar>
        <div class="user-info">
          <div class="name-row">
            <h1>{{ displayName }}</h1>
            <span class="lv-badge">Lv.{{ user.level ?? 1 }}</span>
          </div>
          <p class="bio">{{ user.bio || '这个人很懒，什么都没留下～' }}</p>
          <div class="meta-row">
            <span>@{{ user.username || '-' }}</span>
            <span>加入于 {{ joinedAt }}</span>
            <span>帖子 {{ totalShown }}{{ hasMore ? '+' : '' }}</span>
          </div>
        </div>
        <div class="actions">
          <template v-if="isSelf">
            <el-button type="primary" @click="router.push('/profile')">编辑资料</el-button>
          </template>
          <template v-else>
            <el-button
              :type="following ? 'info' : 'primary'"
              :plain="following"
              @click="handleFollow"
            >{{ following ? '已关注' : '+ 关注' }}</el-button>
            <el-button type="success" plain @click="startChat">💬 私信</el-button>
          </template>
        </div>
      </div>
    </div>

    <div class="section-title">
      <span>{{ isSelf ? '我发布的帖子' : `${displayName} 发布的帖子` }}</span>
    </div>

    <el-alert
      v-if="loadError"
      title="用户信息加载失败，请稍后重试"
      type="error"
      :closable="false"
      show-icon
    />

    <div v-loading="postsLoading" class="posts-wrap">
      <el-alert
        v-if="postsError"
        title="帖子加载失败，请稍后重试"
        type="error"
        :closable="false"
        show-icon
        class="load-alert"
      >
        <el-button size="small" @click="fetchPosts()">重新加载</el-button>
      </el-alert>

      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @like="handlePostLike"
        @collect="handlePostCollect"
        @follow="handlePostFollow"
        @open="openDetail"
      />

      <el-empty
        v-if="!postsLoading && !postsError && !posts.length"
        :description="isSelf ? '你还没有发布过帖子' : '该用户还没有发布过帖子'"
      />

      <div v-if="hasMore && posts.length" class="load-more">
        <el-button :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
    </div>

    <PostDetailDialog
      v-model="detailVisible"
      :post="currentPost"
      @commented="handleCommented"
    />
  </div>
</template>

<style scoped>
.user-profile-page {
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: 24px;
}
.profile-header {
  position: relative;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 10px rgba(31, 35, 41, 0.04);
}
.header-bg {
  height: 84px;
  background: linear-gradient(135deg, #5b8def 0%, #9b59b6 60%, #f39c12 100%);
}
.header-main {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  padding: 0 24px 20px;
  margin-top: -38px;
}
.user-avatar {
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  border: 4px solid #fff;
  box-shadow: 0 4px 14px rgba(31, 35, 41, 0.18);
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
  padding-bottom: 4px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.name-row h1 {
  margin: 0;
  font-size: 22px;
  color: #1f2329;
  overflow-wrap: anywhere;
}
.lv-badge {
  font-size: 11px;
  color: #fff;
  background: linear-gradient(135deg, #5b8def, #7aa5f5);
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.bio {
  margin: 8px 0 6px;
  font-size: 13px;
  color: #4e5969;
  line-height: 1.6;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: #8a919f;
}
.actions {
  display: flex;
  gap: 8px;
  padding-bottom: 4px;
  flex-shrink: 0;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  margin: 4px 2px 12px;
  padding-left: 10px;
  border-left: 3px solid #5b8def;
}
.posts-wrap {
  min-height: 200px;
}
.load-alert {
  margin-bottom: 12px;
}
.load-alert :deep(.el-alert__content) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
@media (max-width: 640px) {
  .header-main {
    flex-wrap: wrap;
  }
  .actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
