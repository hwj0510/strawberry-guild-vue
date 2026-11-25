<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound, Star, Share, Pointer, Picture } from '@element-plus/icons-vue'
import { avatarColor, avatarText } from '@/utils/avatar'
import { formatTime, formatCount } from '@/utils/format'
import { authStateRO } from '@/stores/auth'

const router = useRouter()

const props = defineProps({
  post: { type: Object, required: true },
  // 是否展示编辑/删除（用于“我的帖子”）
  manageable: { type: Boolean, default: false },
})

const emit = defineEmits(['like', 'collect', 'open', 'follow', 'edit', 'delete'])

const currentUserId = computed(() => authStateRO.userInfo?.id)
const isOwn = computed(
  () =>
    props.post.authorId != null &&
    currentUserId.value != null &&
    String(props.post.authorId) === String(currentUserId.value)
)
// 他人的帖子、且已知作者 ID 时才展示关注按钮
const canFollow = computed(() => !!props.post.authorId && !isOwn.value)

const authorColor = computed(() => avatarColor(props.post.author))
const authorInitial = computed(() => avatarText(props.post.author))
const timeText = computed(() => formatTime(props.post.createdAt))
// 后端返回 cover / images，本地 mock 数据使用 image
const coverUrl = computed(
  () => props.post.cover || (props.post.images && props.post.images[0]) || ''
)

function goAuthor() {
  if (props.post.authorId != null) {
    router.push(`/user/${props.post.authorId}`)
  }
}
</script>

<template>
  <div class="post-card">
    <div class="post-head">
      <el-avatar
        :size="40"
        :src="post.avatar || undefined"
        :style="{ background: authorColor }"
        class="post-avatar clickable"
        @click.stop="goAuthor"
      >
        {{ authorInitial }}
      </el-avatar>
      <div class="post-meta">
        <div class="meta-top">
          <span class="author clickable" @click.stop="goAuthor">{{ post.author }}</span>
          <span class="lv-badge">Lv.{{ post.level }}</span>
        </div>
        <div class="meta-sub">{{ timeText }} · 浏览 {{ formatCount(post.views) }}</div>
      </div>
      <div v-if="manageable && isOwn" class="owner-actions" @click.stop>
        <el-button link type="primary" size="small" @click="emit('edit', post)">编辑</el-button>
        <el-button link type="danger" size="small" @click="emit('delete', post)">删除</el-button>
      </div>
      <el-button
        v-else-if="canFollow"
        class="follow-btn"
        size="small"
        :type="post.following ? 'info' : 'primary'"
        :plain="post.following"
        @click.stop="emit('follow', post.authorId)"
      >{{ post.following ? '已关注' : '+ 关注' }}</el-button>
    </div>

    <h3 v-if="post.title" class="post-title" @click="emit('open', post.id)">{{ post.title }}</h3>
    <p v-if="post.content" class="post-content" @click="emit('open', post.id)">{{ post.content }}</p>

    <div v-if="post.tags && post.tags.length" class="post-tags">
      <el-tag
        v-for="t in post.tags"
        :key="t"
        effect="plain"
        size="small"
        round
        class="post-tag"
      >#{{ t }}</el-tag>
    </div>

    <div v-if="coverUrl" class="post-image">
      <el-image :src="coverUrl" fit="cover" class="post-cover" />
    </div>
    <div v-else-if="post.image" class="post-image">
      <el-icon :size="40" color="rgba(255,255,255,.85)"><Picture /></el-icon>
      <span class="post-image-label">{{ post.image }}</span>
    </div>

    <div class="post-actions">
      <div class="action" :class="{ active: post.liked }" @click="emit('like', post.id)">
        <el-icon><Pointer /></el-icon>
        <span>{{ formatCount(post.likes) }}</span>
      </div>
      <div class="action" @click="emit('open', post.id)">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ formatCount(post.comments) }}</span>
      </div>
      <div class="action" :class="{ active: post.collected }" @click="emit('collect', post.id)">
        <el-icon><Star /></el-icon>
        <span>{{ formatCount(post.collects) }}</span>
      </div>
      <div class="action">
        <el-icon><Share /></el-icon>
        <span>{{ formatCount(post.shares) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.post-card {
  padding: 18px 20px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: box-shadow 0.2s;
  cursor: pointer;
}
.post-card:hover {
  box-shadow: 0 4px 16px rgba(91, 141, 239, 0.12);
}
.post-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.post-avatar {
  color: #fff;
  font-weight: 600;
  flex-shrink: 0;
}
.clickable {
  cursor: pointer;
  transition: opacity 0.15s;
}
.clickable:hover {
  opacity: 0.82;
}
.author.clickable:hover {
  color: #5b8def;
  opacity: 1;
}
.post-meta {
  flex: 1;
  min-width: 0;
}
.follow-btn {
  flex-shrink: 0;
}
.owner-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.meta-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.author {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
}
.lv-badge {
  font-size: 11px;
  color: #fff;
  background: linear-gradient(135deg, #5b8def, #7aa5f5);
  padding: 1px 6px;
  border-radius: 4px;
}
.meta-sub {
  font-size: 12px;
  color: #8a919f;
  margin-top: 2px;
}
.post-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  margin: 0 0 6px;
  line-height: 1.5;
}
.post-content {
  font-size: 14px;
  color: #4e5969;
  line-height: 1.7;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.post-tag {
  border-color: #d6e4ff;
  color: #5b8def;
  background: #f0f5ff;
}
.post-image {
  height: 180px;
  border-radius: 10px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #5b8def 0%, #9b59b6 50%, #f39c12 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
}
.post-cover {
  width: 100%;
  height: 100%;
  display: block;
}
.post-image-label {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}
.post-actions {
  display: flex;
  gap: 28px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
}
.action {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #8a919f;
  cursor: pointer;
  transition: color 0.15s;
}
.action:hover {
  color: #5b8def;
}
.action.active {
  color: #f56c6c;
}
</style>
