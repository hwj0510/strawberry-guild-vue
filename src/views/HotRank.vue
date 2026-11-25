<script setup>
import { computed, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { getHotTopics } from '@/api/post'
import { normalizePost } from '@/composables/useHomeFeed'
import { avatarColor, avatarText } from '@/utils/avatar'
import PostDetailDialog from '@/components/PostDetailDialog.vue'

const categories = [
  { label: '全站', value: '' },
  { label: '游戏', value: '游戏' },
  { label: '影视', value: '影视' },
]

const activeCategory = ref('')
const posts = ref([])
const loading = ref(false)
const loadError = ref(false)
const updatedAt = ref('')

const top3 = computed(() => posts.value.slice(0, 3))
const rest = computed(() => posts.value.slice(3))

const podiumOrder = computed(() => {
  const [first, second, third] = top3.value
  return [
    { post: second, rank: 2 },
    { post: first, rank: 1 },
    { post: third, rank: 3 },
  ].filter((item) => item.post)
})

async function fetchHot() {
  loading.value = true
  loadError.value = false
  try {
    const data = await getHotTopics(50, activeCategory.value || undefined)
    const list = Array.isArray(data) ? data : []
    posts.value = list.map(normalizePost)
    updatedAt.value = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    posts.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function switchCategory(value) {
  if (activeCategory.value === value) return
  activeCategory.value = value
  fetchHot()
}

function formatHeat(value) {
  const num = Number(value) || 0
  return num >= 10000 ? `${(num / 10000).toFixed(1)} 万` : String(num)
}

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

const detailVisible = ref(false)
const currentPost = ref(null)

function openDetail(post) {
  if (!post) return
  currentPost.value = post
  detailVisible.value = true
}

function handleCommented({ postId, comments }) {
  const post = posts.value.find((p) => String(p.id) === String(postId))
  if (post) post.comments = comments
}

onMounted(fetchHot)
</script>

<template>
  <div class="hot-page">
    <!-- 顶部 Banner -->
    <div class="hot-banner">
      <div class="banner-main">
        <h1>🔥 全站热榜</h1>
        <p>按浏览量实时排序，看看大家都在读什么</p>
        <div class="banner-meta">
          <span>榜单 {{ posts.length }} 篇</span>
          <span v-if="updatedAt">更新于 {{ updatedAt }}</span>
        </div>
      </div>
      <div class="banner-actions">
        <button
          v-for="c in categories"
          :key="c.value"
          class="banner-tab"
          :class="{ active: activeCategory === c.value }"
          @click="switchCategory(c.value)"
        >{{ c.label }}</button>
        <span class="refresh" @click="fetchHot">
          <el-icon><Refresh /></el-icon>
        </span>
      </div>
    </div>

    <el-alert
      v-if="loadError"
      title="热榜加载失败，请稍后重试"
      type="error"
      :closable="false"
      show-icon
      class="error-alert"
    >
      <el-button size="small" @click="fetchHot">重新加载</el-button>
    </el-alert>

    <div v-loading="loading" class="hot-body">
      <!-- 前三名 -->
      <div v-if="podiumOrder.length" class="podium">
        <div
          v-for="item in podiumOrder"
          :key="item.post.id"
          class="podium-card"
          :class="`rank-${item.rank}`"
          @click="openDetail(item.post)"
        >
          <div class="podium-rank">{{ item.rank }}</div>
          <div class="podium-badge">
            {{ item.rank === 1 ? '🥇 榜首' : item.rank === 2 ? '🥈 亚军' : '🥉 季军' }}
          </div>
          <h3 class="podium-title">{{ item.post.title || item.post.content.slice(0, 24) }}</h3>
          <div class="podium-author">
            <el-avatar
              :size="24"
              :src="item.post.avatar || undefined"
              :style="{ background: avatarColor(item.post.author) }"
            >{{ avatarText(item.post.author) }}</el-avatar>
            <span>{{ item.post.author }}</span>
          </div>
          <div class="podium-stats">
            <span>🔥 {{ formatHeat(item.post.views) }}</span>
            <span>👍 {{ item.post.likes }}</span>
            <span v-if="item.post.tags.length" class="podium-tag">#{{ item.post.tags[0] }}</span>
          </div>
        </div>
      </div>

      <!-- 4 名之后 -->
      <div v-if="rest.length" class="rank-list">
        <div
          v-for="(post, index) in rest"
          :key="post.id"
          class="rank-row"
          @click="openDetail(post)"
        >
          <span class="row-rank" :class="{ top: index + 4 <= 10 }">{{ index + 4 }}</span>
          <div class="row-main">
            <div class="row-title">{{ post.title || post.content.slice(0, 30) }}</div>
            <div class="row-meta">
              <span>{{ post.author }}</span>
              <span>{{ formatTime(post.createdAt) }}</span>
              <span v-if="post.category" class="row-category">{{ post.category }}</span>
              <span v-for="t in post.tags.slice(0, 2)" :key="t" class="row-tag">#{{ t }}</span>
            </div>
          </div>
          <div class="row-stats">
            <span class="heat">🔥 {{ formatHeat(post.views) }}</span>
            <span>👍 {{ post.likes }}</span>
            <span>💬 {{ post.comments }}</span>
          </div>
        </div>
      </div>

      <el-empty
        v-if="!loading && !loadError && !posts.length"
        :description="activeCategory ? '该分类下暂无上榜内容' : '暂无热榜内容'"
      />
    </div>

    <PostDetailDialog
      v-model="detailVisible"
      :post="currentPost"
      @commented="handleCommented"
    />
  </div>
</template>

<style scoped>
.hot-page {
  max-width: 960px;
  margin: 0 auto;
}
.hot-banner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 28px 28px 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff9a6b 0%, #ff6b9d 62%, #f75fa5 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgba(255, 107, 157, 0.28);
  margin-bottom: 16px;
}
.banner-main h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
}
.banner-main p {
  margin: 0 0 10px;
  font-size: 13px;
  opacity: 0.92;
}
.banner-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  opacity: 0.88;
}
.banner-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.banner-tab {
  padding: 6px 16px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.16s;
}
.banner-tab:hover {
  background: rgba(255, 255, 255, 0.28);
}
.banner-tab.active {
  background: #fff;
  color: #e64980;
  font-weight: 700;
  border-color: #fff;
}
.refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: all 0.16s;
}
.refresh:hover {
  background: rgba(255, 255, 255, 0.32);
  transform: rotate(90deg);
}
.error-alert {
  margin-bottom: 12px;
}
.hot-body {
  min-height: 240px;
}
.podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 12px;
  align-items: stretch;
}
.podium-card {
  position: relative;
  background: #fff;
  border-radius: 14px;
  padding: 20px 16px 16px;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid #ffe3ee;
  transition: all 0.18s;
}
.podium-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(255, 126, 179, 0.2);
}
.podium-card.rank-1 {
  background: linear-gradient(160deg, #fff8e6, #fff);
  border-color: #ffd66b;
}
.podium-card.rank-2 {
  background: linear-gradient(160deg, #f6f8ff, #fff);
  border-color: #c9d8ff;
}
.podium-card.rank-3 {
  background: linear-gradient(160deg, #fff6ef, #fff);
  border-color: #ffd0b3;
}
.podium-rank {
  position: absolute;
  right: 10px;
  top: 2px;
  font-size: 58px;
  font-weight: 900;
  font-style: italic;
  color: rgba(255, 126, 179, 0.1);
  line-height: 1;
  pointer-events: none;
}
.rank-1 .podium-rank {
  color: rgba(255, 178, 36, 0.22);
}
.podium-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: #e64980;
  background: #ffe8f1;
  border-radius: 9px;
  padding: 2px 9px;
  margin-bottom: 10px;
}
.rank-1 .podium-badge {
  color: #b7791f;
  background: #fff1c9;
}
.podium-title {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.5;
  color: #1f2329;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 45px;
}
.podium-author {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #4e5969;
  margin-bottom: 10px;
}
.podium-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #8a919f;
}
.podium-tag {
  margin-left: auto;
  color: #e64980;
  background: #fff0f6;
  border-radius: 8px;
  padding: 1px 7px;
}
.rank-list {
  background: #fff;
  border-radius: 14px;
  padding: 6px 18px;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid #f5f6f7;
  cursor: pointer;
}
.rank-row:last-child {
  border-bottom: none;
}
.row-rank {
  width: 26px;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  font-style: italic;
  color: #c0c6cf;
  flex-shrink: 0;
}
.row-rank.top {
  color: #ff8f5a;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 14px;
  color: #1f2329;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}
.rank-row:hover .row-title {
  color: #e64980;
}
.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: 11px;
  color: #8a919f;
}
.row-category {
  color: #5b8def;
  background: #eef4ff;
  border-radius: 7px;
  padding: 1px 7px;
}
.row-tag {
  color: #e64980;
}
.row-stats {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  font-size: 12px;
  color: #8a919f;
}
.row-stats .heat {
  color: #ff7a45;
  font-weight: 600;
}
@media (max-width: 760px) {
  .hot-banner {
    padding: 20px;
  }
  .podium {
    grid-template-columns: 1fr;
  }
  .podium-card {
    display: flex;
    flex-direction: column;
  }
  .row-stats {
    flex-direction: column;
    gap: 2px;
    align-items: flex-end;
  }
}
</style>
