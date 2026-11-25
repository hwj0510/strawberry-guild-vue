<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Star } from '@element-plus/icons-vue'
import PostCard from '@/components/PostCard.vue'
import { getCollectedPosts, toggleCollect, toggleLike } from '@/api/post'
import { toggleFollow } from '@/api/auth'
import { normalizePost } from '@/composables/useHomeFeed'

const PAGE_SIZE = 10
const router = useRouter()
const posts = ref([])
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref(false)
const pendingLikes = new Set()
const pendingCollects = new Set()
let requestSeq = 0

async function fetchFavorites(append = false) {
  if (append && (loadingMore.value || !hasMore.value)) return

  const current = ++requestSeq
  loadError.value = false
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    page.value = 1
  }

  try {
    const data = await getCollectedPosts({ page: page.value, size: PAGE_SIZE })
    if (current !== requestSeq) return

    const rawList = Array.isArray(data) ? data : data?.list || []
    const list = rawList.map(normalizePost)
    hasMore.value = Array.isArray(data)
      ? rawList.length === PAGE_SIZE
      : page.value * PAGE_SIZE < (data?.total || 0)
    posts.value = append ? [...posts.value, ...list] : list
  } catch {
    if (current !== requestSeq) return
    if (append) {
      page.value = Math.max(1, page.value - 1)
    } else {
      posts.value = []
      hasMore.value = false
      loadError.value = true
    }
  } finally {
    if (current === requestSeq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value += 1
  fetchFavorites(true)
}

async function handleLike(id) {
  const post = posts.value.find((item) => String(item.id) === String(id))
  if (!post || pendingLikes.has(id)) return

  pendingLikes.add(id)
  try {
    const result = await toggleLike(id)
    post.liked = result.liked
    post.likes = result.likeCount
  } catch {
    // 请求失败时保留原状态，错误由拦截器提示
  } finally {
    pendingLikes.delete(id)
  }
}

async function handleCollect(id) {
  const post = posts.value.find((item) => String(item.id) === String(id))
  if (!post || pendingCollects.has(id)) return

  pendingCollects.add(id)
  try {
    const result = await toggleCollect(id)
    post.collected = result.collected
    post.collects = result.collectCount
    if (!result.collected) {
      posts.value = posts.value.filter((item) => String(item.id) !== String(id))
      ElMessage.success('已取消收藏')
    }
  } catch {
    // 取消失败时保留卡片
  } finally {
    pendingCollects.delete(id)
  }
}

async function handleFollow(authorId) {
  const targets = posts.value.filter((item) => String(item.authorId) === String(authorId))
  if (!targets.length) return
  const prevFollowing = !!targets[0].following
  targets.forEach((item) => {
    item.following = !prevFollowing
  })
  try {
    const result = await toggleFollow(authorId)
    if (result && typeof result.following === 'boolean') {
      targets.forEach((item) => {
        item.following = result.following
      })
    }
  } catch {
    targets.forEach((item) => {
      item.following = prevFollowing
    })
  }
}

function openPost(id) {
  router.push({ path: '/', query: { postId: String(id) } })
}

onMounted(() => fetchFavorites())
</script>

<template>
  <div class="favorites-page">
    <div class="favorites-header">
      <div>
        <h1><el-icon><Star /></el-icon> 我的收藏</h1>
        <p>收藏的攻略和帖子都在这里</p>
      </div>
      <el-button
        :icon="Refresh"
        :loading="loading"
        :disabled="loadingMore"
        @click="fetchFavorites(false)"
      >刷新</el-button>
    </div>

    <el-alert
      v-if="loadError"
      title="收藏列表加载失败，请稍后重试"
      type="error"
      :closable="false"
      show-icon
      class="load-alert"
    >
      <el-button size="small" @click="fetchFavorites(false)">重新加载</el-button>
    </el-alert>

    <div v-loading="loading" class="favorite-list">
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @like="handleLike"
        @collect="handleCollect"
        @follow="handleFollow"
        @open="openPost"
      />

      <el-empty
        v-if="!loading && !loadError && !posts.length"
        description="还没有收藏帖子，去首页发现感兴趣的攻略吧"
      >
        <el-button type="primary" @click="router.push('/')">去首页看看</el-button>
      </el-empty>

      <div v-if="hasMore && !loading && posts.length" class="load-more">
        <el-button :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.favorites-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 8px 0 24px;
}
.favorites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.favorites-header h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  color: #1f2329;
  font-size: 24px;
}
.favorites-header h1 .el-icon {
  color: #e6a23c;
}
.favorites-header p {
  margin: 0;
  color: #8a919f;
  font-size: 14px;
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
.favorite-list {
  min-height: 300px;
}
.favorite-list :deep(.el-empty) {
  padding: 56px 20px;
  background: #fff;
  border-radius: 12px;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
@media (max-width: 600px) {
  .favorites-header {
    align-items: flex-start;
  }
  .favorites-header h1 {
    font-size: 21px;
  }
}
</style>
