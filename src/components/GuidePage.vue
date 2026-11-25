<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import PostCard from '@/components/PostCard.vue'
import PostDetailDialog from '@/components/PostDetailDialog.vue'
import {
  getPosts,
  getPostCount,
  getTags,
  toggleLike as apiToggleLike,
  toggleCollect as apiToggleCollect,
} from '@/api/post'
import { toggleFollow as apiToggleFollow } from '@/api/auth'
import { normalizePost } from '@/composables/useHomeFeed'

const props = defineProps({
  category: { type: String, required: true },
  title: { type: String, default: '攻略' },
  subtitle: { type: String, default: '' },
  bannerBg: { type: String, default: 'linear-gradient(135deg,#5b8def,#9b59b6)' },
  subTags: { type: Array, default: () => ['全部', '攻略', '求助', '推荐', '吐槽', '闲聊'] },
})

const PAGE_SIZE = 10
const route = useRoute()
const router = useRouter()

const posts = ref([])
const hotPosts = ref([])
const tagOptions = ref([])
const total = ref(0)

const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref(false)
const hasMore = ref(false)
const page = ref(1)

const activeTag = ref('全部')
const sortBy = ref('latest')

let seq = 0

const keyword = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim() : ''
)

// 标签名 -> 标签 ID，用于服务端筛选
const tagIdMap = computed(() => {
  const map = new Map()
  tagOptions.value.forEach((t) => {
    if (t?.name != null && t?.id != null) map.set(t.name, t.id)
  })
  return map
})

// 展示用标签：预设标签 + 当前分类下实际出现的标签
const displayTags = computed(() => {
  const preset = props.subTags.filter((t) => t !== '全部')
  const used = new Set()
  posts.value.forEach((p) => p.tags.forEach((t) => used.add(t)))
  hotPosts.value.forEach((p) => p.tags.forEach((t) => used.add(t)))
  return [...new Set([...preset, ...used])]
})

const activeTagId = computed(() => tagIdMap.value.get(activeTag.value) ?? null)

async function fetchList(append = false) {
  if (append && (loadingMore.value || !hasMore.value)) return

  const current = ++seq
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    page.value = 1
  }
  if (!append) loadError.value = false

  const params = {
    page: page.value,
    size: PAGE_SIZE,
    category: props.category,
    sort: sortBy.value,
  }
  if (activeTag.value !== '全部' && activeTagId.value != null) {
    params.tagId = activeTagId.value
  }
  if (keyword.value) params.keyword = keyword.value

  try {
    const data = await getPosts(params)
    if (current !== seq) return

    const rawList = Array.isArray(data) ? data : data?.list || []
    let list = rawList.map(normalizePost)
    // 标签没有对应 ID 时退化为当前列表内的客户端筛选
    if (activeTag.value !== '全部' && activeTagId.value == null) {
      list = list.filter((p) => p.tags.includes(activeTag.value))
    }
    hasMore.value = Array.isArray(data)
      ? rawList.length === PAGE_SIZE
      : page.value * PAGE_SIZE < (data?.total || 0)
    posts.value = append ? [...posts.value, ...list] : list
  } catch {
    if (current !== seq) return
    if (!append) {
      posts.value = []
      hasMore.value = false
      loadError.value = true
    }
  } finally {
    if (current === seq) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  page.value += 1
  await fetchList(true)
}

async function fetchHot() {
  try {
    const data = await getPosts({ category: props.category, sort: 'hot', size: 5 })
    const list = Array.isArray(data) ? data : data?.list || []
    hotPosts.value = list.map(normalizePost)
  } catch {
    hotPosts.value = []
  }
}

async function fetchCount() {
  try {
    const data = await getPostCount(props.category)
    total.value = data?.count ?? 0
  } catch {
    total.value = 0
  }
}

async function fetchTags() {
  try {
    const data = await getTags()
    tagOptions.value = Array.isArray(data) ? data : data?.list || []
  } catch {
    tagOptions.value = []
  }
}

function refresh() {
  fetchList()
  fetchHot()
  fetchCount()
}

function handleTagClick(tag) {
  if (activeTag.value === tag) return
  activeTag.value = tag
  fetchList()
}

function clearKeyword() {
  const query = { ...route.query }
  delete query.q
  router.replace({ path: route.path, query })
}

// 点赞 / 收藏 / 关注：乐观更新，失败回滚
async function handleLike(id) {
  const post = posts.value.find((p) => String(p.id) === String(id))
  if (!post) return
  const prevLiked = !!post.liked
  const prevCount = post.likes || 0
  post.liked = !prevLiked
  post.likes = prevCount + (post.liked ? 1 : -1)
  try {
    const res = await apiToggleLike(id)
    if (res && typeof res.likeCount === 'number') {
      post.liked = res.liked
      post.likes = res.likeCount
    }
  } catch {
    post.liked = prevLiked
    post.likes = prevCount
  }
}

async function handleCollect(id) {
  const post = posts.value.find((p) => String(p.id) === String(id))
  if (!post) return
  const prevCollected = !!post.collected
  const prevCount = post.collects || 0
  post.collected = !prevCollected
  post.collects = prevCount + (post.collected ? 1 : -1)
  try {
    const res = await apiToggleCollect(id)
    if (res && typeof res.collectCount === 'number') {
      post.collected = res.collected
      post.collects = res.collectCount
    }
  } catch {
    post.collected = prevCollected
    post.collects = prevCount
  }
}

async function handleFollow(authorId) {
  const targets = [...posts.value, ...hotPosts.value].filter(
    (p) => String(p.authorId) === String(authorId)
  )
  if (!targets.length) return
  const prevFollowing = !!targets[0].following
  targets.forEach((p) => {
    p.following = !prevFollowing
  })
  try {
    const res = await apiToggleFollow(authorId)
    if (res && typeof res.following === 'boolean') {
      targets.forEach((p) => {
        p.following = res.following
      })
    }
  } catch {
    targets.forEach((p) => {
      p.following = prevFollowing
    })
  }
}

// 帖子详情
const detailVisible = ref(false)
const currentPost = ref(null)

function openDetail(id) {
  const post =
    posts.value.find((p) => String(p.id) === String(id)) ||
    hotPosts.value.find((p) => String(p.id) === String(id))
  if (!post) return
  currentPost.value = post
  detailVisible.value = true
}

function handleCommented({ postId, comments }) {
  const post = posts.value.find((p) => String(p.id) === String(postId))
  if (post) post.comments = comments
}

watch(keyword, () => fetchList())
watch(sortBy, () => fetchList())

onMounted(() => {
  fetchTags().then(() => fetchList())
  fetchHot()
  fetchCount()
})
</script>

<template>
  <div class="guide-page">
    <!-- 顶部 Banner -->
    <div class="guide-banner" :style="{ background: bannerBg }">
      <h1 class="banner-title">{{ title }}</h1>
      <p class="banner-sub">{{ subtitle }}</p>
      <div class="banner-stat">
        共 {{ total }} 篇攻略 · {{ displayTags.length }} 个标签
      </div>
    </div>

    <div class="guide-layout">
      <div class="guide-main">
        <!-- 搜索关键词 -->
        <div v-if="keyword" class="search-bar">
          <span>搜索关键词：<b>{{ keyword }}</b></span>
          <a @click="clearKeyword">清除</a>
        </div>

        <!-- 筛选 + 排序栏 -->
        <div class="filter-bar">
          <div class="filter-tags">
            <span
              v-for="t in ['全部', ...displayTags]"
              :key="t"
              class="filter-tag"
              :class="{ active: activeTag === t }"
              @click="handleTagClick(t)"
            >{{ t }}</span>
          </div>
          <div class="filter-extra">
            <el-radio-group v-model="sortBy" size="small">
              <el-radio-button value="latest">最新</el-radio-button>
              <el-radio-button value="hot">最热</el-radio-button>
            </el-radio-group>
            <div class="refresh-btn" @click="refresh">
              <el-icon><Refresh /></el-icon>
            </div>
          </div>
        </div>

        <el-alert
          v-if="loadError"
          title="加载失败，请稍后重试"
          type="error"
          :closable="false"
          show-icon
          class="error-alert"
        >
          <el-button size="small" @click="refresh">重新加载</el-button>
        </el-alert>

        <div v-loading="loading" class="post-list">
          <PostCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
            @like="handleLike"
            @collect="handleCollect"
            @follow="handleFollow"
            @open="openDetail"
          />
          <el-empty
            v-if="!loading && !loadError && !posts.length"
            :description="keyword ? '没有找到相关帖子' : '该分类下暂无内容'"
          />
          <div v-if="hasMore && !loading" class="load-more">
            <el-button :loading="loadingMore" @click="loadMore">加载更多</el-button>
          </div>
        </div>
      </div>

      <aside class="guide-side">
        <div class="side-card">
          <div class="card-head">
            <span class="card-title">🏆 本周热门</span>
          </div>
          <ol class="top-list">
            <li
              v-for="(p, i) in hotPosts"
              :key="p.id"
              class="top-item"
              @click="openDetail(p.id)"
            >
              <span class="top-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
              <div class="top-info">
                <div class="top-title">{{ p.title || p.content.slice(0, 20) }}</div>
                <div class="top-meta">{{ p.author }} · {{ p.likes }} 赞</div>
              </div>
            </li>
          </ol>
          <el-empty v-if="!hotPosts.length" :image-size="60" description="暂无热门" />
        </div>

        <div class="side-card">
          <div class="card-head">
            <span class="card-title">🏷 热门标签</span>
          </div>
          <div class="tag-cloud">
            <span
              v-for="t in displayTags"
              :key="t"
              class="cloud-tag"
              :class="{ active: activeTag === t }"
              @click="handleTagClick(t)"
            >#{{ t }}</span>
          </div>
          <el-empty v-if="!displayTags.length" :image-size="60" description="暂无标签" />
        </div>
      </aside>
    </div>

    <PostDetailDialog
      v-model="detailVisible"
      :post="currentPost"
      @commented="handleCommented"
    />
  </div>
</template>

<style scoped>
.guide-banner {
  border-radius: 14px;
  padding: 32px 28px;
  color: #fff;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.banner-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 8px;
}
.banner-sub {
  font-size: 14px;
  opacity: 0.92;
  margin: 0 0 12px;
}
.banner-stat {
  font-size: 13px;
  opacity: 0.85;
}
.guide-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.guide-main {
  flex: 1;
  min-width: 0;
}
.guide-side {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 76px;
}
.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 10px;
  padding: 8px 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #4e5969;
}
.search-bar b {
  color: #5b8def;
}
.search-bar a {
  color: #5b8def;
  cursor: pointer;
}
.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.filter-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.filter-tag {
  padding: 5px 14px;
  font-size: 13px;
  color: #4e5969;
  background: #f2f3f5;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-tag:hover {
  background: #e8f0ff;
  color: #5b8def;
}
.filter-tag.active {
  background: #5b8def;
  color: #fff;
}
.filter-extra {
  display: flex;
  align-items: center;
  gap: 10px;
}
.refresh-btn {
  display: flex;
  align-items: center;
  color: #8a919f;
  cursor: pointer;
  transition: color 0.15s;
}
.refresh-btn:hover {
  color: #5b8def;
}
.error-alert {
  margin-bottom: 12px;
}
.post-list {
  min-height: 160px;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}
.side-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.card-head {
  margin-bottom: 12px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2329;
}
.top-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.top-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f6f7;
  cursor: pointer;
}
.top-item:last-child {
  border-bottom: none;
}
.top-rank {
  width: 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #8a919f;
  flex-shrink: 0;
  padding-top: 2px;
}
.top-rank.top {
  color: #f56c6c;
}
.top-title {
  font-size: 13px;
  color: #4e5969;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.top-item:hover .top-title {
  color: #5b8def;
}
.top-meta {
  font-size: 11px;
  color: #8a919f;
  margin-top: 4px;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cloud-tag {
  font-size: 12px;
  padding: 4px 10px;
  background: #f2f3f5;
  color: #4e5969;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.cloud-tag:hover {
  background: #e8f0ff;
  color: #5b8def;
}
.cloud-tag.active {
  background: #5b8def;
  color: #fff;
}
@media (max-width: 960px) {
  .guide-layout {
    flex-direction: column;
  }
  .guide-side {
    width: 100%;
    position: static;
  }
}
</style>
