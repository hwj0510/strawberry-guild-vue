<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getPostDetail, getComments, createComment } from '@/api/post'
import { normalizePost } from '@/composables/useHomeFeed'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  post: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'commented'])

const loading = ref(false)
const detail = ref(null)
const comments = ref([])
const commentInput = ref('')
const submitting = ref(false)

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible || !props.post) return
    detail.value = props.post
    commentInput.value = ''
    loading.value = true
    try {
      // 详情接口会累计一次浏览量
      const raw = await getPostDetail(props.post.id)
      detail.value = { ...props.post, ...normalizePost(raw) }
      comments.value = await getComments(props.post.id)
    } catch {
      comments.value = []
    } finally {
      loading.value = false
    }
  }
)

async function submitComment() {
  const content = commentInput.value.trim()
  if (!content || !detail.value || submitting.value) return
  submitting.value = true
  try {
    const comment = await createComment(detail.value.id, { content })
    comments.value = [comment, ...comments.value]
    commentInput.value = ''
    detail.value.comments = (detail.value.comments || 0) + 1
    emit('commented', { postId: detail.value.id, comments: detail.value.comments })
    ElMessage.success('评论成功')
  } finally {
    submitting.value = false
  }
}

function formatCommentTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="detail?.title || '帖子详情'"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="detail-body">
      <template v-if="detail">
        <p v-if="detail.content" class="detail-content">{{ detail.content }}</p>
        <div v-if="detail.tags?.length" class="detail-tags">
          <el-tag
            v-for="t in detail.tags"
            :key="t"
            size="small"
            effect="plain"
            round
            class="detail-tag"
          >#{{ t }}</el-tag>
        </div>
        <div class="detail-stats">
          浏览 {{ detail.views || 0 }} · 点赞 {{ detail.likes || 0 }} · 收藏 {{ detail.collects || 0 }}
        </div>
        <el-divider />
        <div class="comment-title">评论 {{ detail.comments || 0 }}</div>
        <div class="comment-editor">
          <el-input
            v-model="commentInput"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="写下你的评论..."
          />
          <el-button type="primary" :loading="submitting" @click="submitComment">发表评论</el-button>
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
</template>

<style scoped>
.detail-body {
  min-height: 120px;
}
.detail-content {
  font-size: 15px;
  color: #1f2329;
  line-height: 1.8;
  white-space: pre-wrap;
  margin: 0 0 10px;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.detail-tag {
  border-color: #d6e4ff;
  color: #5b8def;
  background: #f0f5ff;
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
