<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Trophy, Film, Cpu, TrendCharts } from '@element-plus/icons-vue'
import PostCard from '@/components/PostCard.vue'
import PublishBox from '@/components/PublishBox.vue'
import { useHomeFeed, normalizePost } from '@/composables/useHomeFeed'
import { getPostDetail, getComments, createComment } from '@/api/post'

const route = useRoute()
const router = useRouter()
const publishBoxRef = ref()

const {
  posts,
  hotTopics,
  tagOptions,
  loading,
  loadingMore,
  publishing,
  hasMore,
  fetchList,
  loadMore,
  fetchHot,
  fetchTags,
  publish,
  handleLike,
  handleCollect,
  handleFollow,
} = useHomeFeed()

const quickCards = [
  { title: '游戏攻略', desc: '海量通关心得 · Boss 打法', path: '/game', icon: Trophy, bg: 'linear-gradient(135deg,#5b8def,#7aa5f5)' },
  { title: '影视攻略', desc: '剧情解析 · 年度片单', path: '/movie', icon: Film, bg: 'linear-gradient(135deg,#9b59b6,#b370cc)' },
  { title: 'AI 聊天', desc: 'AI 姬在线陪聊答疑', path: '/ai', icon: Cpu, bg: 'linear-gradient(135deg,#f39c12,#f5b041)' },
  { title: '热门榜单', desc: '社区热议一网打尽', path: '/', icon: TrendCharts, bg: 'linear-gradient(135deg,#e74c3c,#ec7063)' },
]

const tabs = [
  { key: 'follow', label: '关注' },
  { key: 'recommend', label: '推荐' },
  { key: '游戏', label: '游戏' },
  { key: '影视', label: '影视' },
  { key: 'AI', label: 'AI' },
]
const activeTab = ref('recommend')

const keyword = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim() : ''
)

function load() {
  return fetchList({ tabRef: activeTab.value, keyword: keyword.value })
}

// Tab 切换 / 搜索关键词变化都重新拉取第一页
watch(activeTab, () => load())
watch(keyword, () => load())
watch(
  () => route.query.postId,
  (value) => {
    const id = Array.isArray(value) ? value[0] : value
    if (id) openDetail(id)
  }
)

onMounted(async () => {
  const postId = Array.isArray(route.query.postId) ? route.query.postId[0] : route.query.postId
  if (postId) openDetail(postId)
  await fetchTags()
  load()
  fetchHot()
})

function handleRefresh() {
  load()
  fetchHot()
}

function handleLoadMore() {
  loadMore({ tabRef: activeTab.value, keyword: keyword.value })
}

async function handlePublish(payload) {
  try {
    await publish(payload)
    publishBoxRef.value?.reset()
    ElMessage.success('发布成功，快去看看吧～')
    fetchTags()
    if (activeTab.value !== 'recommend') {
      activeTab.value = 'recommend'
    } else {
      load()
    }
  } catch {
    // 失败提示由 request 拦截器统一展示，这里保持输入内容
  }
}

function clearKeyword() {
  router.replace({ path: '/', query: {} })
}

function rankClass(rank) {
  return rank <= 3 ? 'top' : ''
}

// 帖子详情 / 评论
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentPost = ref(null)
const comments = ref([])
const commentInput = ref('')
const commentSubmitting = ref(false)

async function openDetail(id) {
  currentPost.value = posts.value.find((p) => String(p.id) === String(id)) || null
  detailVisible.value = true
  detailLoading.value = true
  commentInput.value = ''
  try {
    // 后端详情接口会累计浏览量
    const raw = await getPostDetail(id)
    const detail = normalizePost(raw)
    const index = posts.value.findIndex((p) => String(p.id) === String(id))
    if (index >= 0) {
      const old = posts.value[index]
      posts.value[index] = {
        ...old,
        ...detail,
        liked: old.liked,
        collected: old.collected,
      }
      currentPost.value = posts.value[index]
    } else {
      currentPost.value = detail
    }
    comments.value = await getComments(id)
  } catch {
    comments.value = []
  } finally {
    detailLoading.value = false
  }
}

async function submitComment() {
  const content = commentInput.value.trim()
  if (!content || !currentPost.value || commentSubmitting.value) return
  commentSubmitting.value = true
  try {
    const comment = await createComment(currentPost.value.id, { content })
    comments.value = [comment, ...comments.value]
    commentInput.value = ''
    currentPost.value.comments = (currentPost.value.comments || 0) + 1
    const post = posts.value.find((p) => String(p.id) === String(currentPost.value.id))
    if (post) post.comments = currentPost.value.comments
    ElMessage.success('评论成功')
  } finally {
    commentSubmitting.value = false
  }
}

function handleDetailClosed() {
  if (route.query.postId === undefined) return
  const query = { ...route.query }
  delete query.postId
  router.replace({ path: '/', query })
}

function formatCommentTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <div class="home">
    <div class="home-layout">
      <!-- 左侧主内容 -->
      <div class="home-main">
        <!-- 快捷入口卡片 -->
        <div class="quick-grid">
          <div
            v-for="card in quickCards"
            :key="card.title"
            class="quick-card"
            :style="{ background: card.bg }"
            @click="router.push(card.path)"
          >
            <el-icon :size="28" color="#fff"><component :is="card.icon" /></el-icon>
            <div class="quick-text">
              <div class="quick-title">{{ card.title }}</div>
              <div class="quick-desc">{{ card.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 发帖框 -->
        <PublishBox
          ref="publishBoxRef"
          :tags="tagOptions"
          :loading="publishing"
          @publish="handlePublish"
        />

        <!-- 搜索关键词提示 -->
        <div v-if="keyword" class="search-bar">
          <span>搜索关键词：<b>{{ keyword }}</b></span>
          <a @click="clearKeyword">清除</a>
        </div>

        <!-- 分类 Tab 栏 -->
        <div class="tab-bar">
          <div class="tabs">
            <span
              v-for="tab in tabs"
              :key="tab.key"
              class="tab"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >{{ tab.label }}</span>
          </div>
          <div class="tab-extra" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            <span>刷新</span>
          </div>
        </div>

        <!-- 帖子列表 -->
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
            v-if="!loading && !posts.length"
            :description="keyword ? '没有找到相关帖子' : '暂无内容，快来发布第一条吧～'"
          />
          <div v-if="hasMore && !loading" class="load-more">
            <el-button :loading="loadingMore" @click="handleLoadMore">加载更多</el-button>
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <aside class="home-side">
        <div class="hot-card">
          <div class="card-head">
            <span class="card-title">🔥 全站热榜</span>
            <router-link class="more" to="/hot">更多 ›</router-link>
          </div>
          <ol class="hot-list">
            <li
              v-for="topic in hotTopics"
              :key="topic.postId ?? topic.rank"
              class="hot-item"
              @click="openDetail(topic.postId)"
            >
              <span class="hot-rank" :class="rankClass(topic.rank)">{{ topic.rank }}</span>
              <span class="hot-title">{{ topic.title }}</span>
              <span class="hot-heat">{{ topic.heat }}</span>
            </li>
          </ol>
          <el-empty v-if="!hotTopics.length" :image-size="60" description="暂无热榜" />
        </div>

        <div class="about-card">
          <div class="card-head">
            <span class="card-title">🍓 关于莓攻略</span>
          </div>
          <p class="about-text">
            这里聚集了一群热爱游戏与影视的小伙伴，分享攻略、交流心得，还有 AI 姬随时陪你聊天。遇到卡关？想找片单？来这里就对了！
          </p>
          <el-button type="primary" plain size="small" @click="router.push('/ai')">找 AI 姬聊聊</el-button>
        </div>
      </aside>
    </div>

    <!-- 帖子详情与评论 -->
    <el-dialog
      v-model="detailVisible"
      :title="currentPost?.title || '帖子详情'"
      width="640px"
      @closed="handleDetailClosed"
    >
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="currentPost">
          <p class="detail-content">{{ currentPost.content }}</p>
          <div class="detail-stats">
            浏览 {{ currentPost.views || 0 }} · 点赞 {{ currentPost.likes || 0 }} · 收藏 {{ currentPost.collects || 0 }}
          </div>
          <el-divider />
          <div class="comment-title">评论 {{ currentPost.comments || 0 }}</div>
          <div class="comment-editor">
            <el-input
              v-model="commentInput"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
              placeholder="写下你的评论..."
            />
            <el-button type="primary" :loading="commentSubmitting" @click="submitComment">发表评论</el-button>
          </div>
          <div v-if="comments.length" class="comment-list">
            <div v-for="comment in comments" :key="comment.id" class="comment-item">
              <el-avatar :size="30" :src="comment.author?.avatar || undefined">
                {{ comment.author?.nickname?.slice(0, 1) }}
              </el-avatar>
              <div class="comment-main">
                <div class="comment-author">{{ comment.author?.nickname || '匿名用户' }}</div>
                <div class="comment-text">{{ comment.content }}</div>
                <div class="comment-time">{{ formatCommentTime(comment.createTime) }}</div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无评论，来抢沙发～" :image-size="60" />
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.home-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.home-main {
  flex: 1;
  min-width: 0;
}
.home-side {
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 76px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}
.quick-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
}
.quick-title {
  font-size: 15px;
  font-weight: 700;
}
.quick-desc {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 2px;
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
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 12px;
  padding: 0 16px;
  margin-bottom: 12px;
  height: 48px;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  padding: 0 14px;
  height: 48px;
  line-height: 48px;
  font-size: 15px;
  color: #4e5969;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.tab:hover {
  color: #5b8def;
}
.tab.active {
  color: #5b8def;
  font-weight: 600;
}
.tab.active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 3px;
  background: #5b8def;
  border-radius: 3px 3px 0 0;
}
.tab-extra {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8a919f;
  cursor: pointer;
}
.tab-extra:hover {
  color: #5b8def;
}
.post-list {
  min-height: 160px;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}
.hot-card,
.about-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2329;
}
.more {
  font-size: 12px;
  color: #8a919f;
  cursor: pointer;
  text-decoration: none;
}
.more:hover {
  color: #5b8def;
}
.hot-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f6f7;
  cursor: pointer;
}
.hot-item:last-child {
  border-bottom: none;
}
.hot-item:hover .hot-title {
  color: #5b8def;
}
.hot-rank {
  width: 20px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #8a919f;
  flex-shrink: 0;
}
.hot-rank.top {
  color: #f56c6c;
}
.hot-title {
  flex: 1;
  font-size: 13px;
  color: #4e5969;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}
.hot-heat {
  font-size: 12px;
  color: #8a919f;
  flex-shrink: 0;
}
.about-text {
  font-size: 13px;
  color: #4e5969;
  line-height: 1.7;
  margin: 0 0 12px;
}
.detail-body {
  min-height: 120px;
}
.detail-content {
  font-size: 15px;
  color: #1f2329;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0 0 12px;
}
.detail-stats {
  font-size: 12px;
  color: #8a919f;
}
.comment-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 12px;
}
.comment-editor {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 18px;
}
.comment-editor .el-button {
  flex-shrink: 0;
}
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.comment-item {
  display: flex;
  gap: 10px;
}
.comment-main {
  flex: 1;
  min-width: 0;
}
.comment-author {
  font-size: 13px;
  font-weight: 600;
  color: #4e5969;
}
.comment-text {
  font-size: 14px;
  color: #1f2329;
  line-height: 1.6;
  margin-top: 4px;
  white-space: pre-wrap;
}
.comment-time {
  font-size: 12px;
  color: #8a919f;
  margin-top: 4px;
}
</style>
