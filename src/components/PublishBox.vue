<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture, ChatLineSquare, MagicStick, Promotion } from '@element-plus/icons-vue'
import { PRESET_TAGS } from '@/composables/usePosts'

const props = defineProps({
  placeholder: { type: String, default: '说你想说，问你想问' },
  // 后端返回的标签列表（[{id,name,count}] 或 ['游戏',...]），为空时回退本地预设
  tags: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['publish'])

const tagList = computed(() => {
  // 预设标签始终保留，后端返回的新标签合并进来，避免可选标签越用越少
  const names = [...PRESET_TAGS]
  for (const tag of props.tags || []) {
    const name = typeof tag === 'string' ? tag : tag?.name
    if (name && !names.includes(name)) names.push(name)
  }
  return names
})

const title = ref('')
const content = ref('')
const selectedTags = ref([])
const customTag = ref('')

function toggleTag(tag) {
  const i = selectedTags.value.indexOf(tag)
  if (i > -1) selectedTags.value.splice(i, 1)
  else if (selectedTags.value.length < 5) selectedTags.value.push(tag)
}

function removeTag(tag) {
  const i = selectedTags.value.indexOf(tag)
  if (i > -1) selectedTags.value.splice(i, 1)
}

function addCustomTag() {
  const t = customTag.value.trim()
  if (t && !selectedTags.value.includes(t) && selectedTags.value.length < 5) {
    selectedTags.value.push(t)
  }
  customTag.value = ''
}

function handlePublish() {
  if (props.loading) return
  if (!title.value.trim()) {
    ElMessage.warning('请输入标题')
    return
  }
  if (!content.value.trim()) {
    ElMessage.warning('请输入内容')
    return
  }
  emit('publish', {
    title: title.value.trim(),
    content: content.value.trim(),
    tags: [...selectedTags.value],
  })
}

// 发布成功后由父组件调用，清空输入
function reset() {
  title.value = ''
  content.value = ''
  selectedTags.value = []
  customTag.value = ''
}

defineExpose({ reset })
</script>

<template>
  <div class="publish-box">
    <div class="publish-head">
      <span class="publish-hint">💡 分享你的游戏 / 影视心得，或向社区提问</span>
    </div>

    <el-input
      v-model="title"
      maxlength="200"
      show-word-limit
      placeholder="请输入标题（必填）"
      class="publish-title"
      size="large"
    />

    <el-input
      v-model="content"
      type="textarea"
      :rows="3"
      resize="none"
      :placeholder="placeholder"
      class="publish-textarea"
    />

    <div v-if="selectedTags.length" class="selected-tags">
      <el-tag
        v-for="t in selectedTags"
        :key="t"
        closable
        type="primary"
        effect="light"
        round
        @close="removeTag(t)"
      >#{{ t }}</el-tag>
    </div>

    <div class="publish-footer">
      <div class="publish-tools">
        <span class="tool"><el-icon><Picture /></el-icon>图片</span>
        <span class="tool"><el-icon><ChatLineSquare /></el-icon>表情</span>
        <span class="tool"><el-icon><MagicStick /></el-icon>AI配图</span>
        <span class="tag-label">添加标签：</span>
        <span
          v-for="t in tagList"
          :key="t"
          class="tag-chip"
          :class="{ active: selectedTags.includes(t) }"
          @click="toggleTag(t)"
        >{{ t }}</span>
        <el-input
          v-model="customTag"
          size="small"
          placeholder="自定义标签"
          class="custom-tag-input"
          @keyup.enter="addCustomTag"
        />
      </div>
      <div class="publish-actions">
        <el-button text>写文章</el-button>
        <el-button type="primary" :icon="Promotion" :loading="loading" @click="handlePublish">发布</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.publish-box {
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.publish-head {
  margin-bottom: 10px;
}
.publish-hint {
  font-size: 13px;
  color: #8a919f;
}
.publish-title {
  margin-bottom: 8px;
}
.publish-title :deep(.el-input__wrapper) {
  box-shadow: none;
  background: #f7f8fa;
  padding: 4px 12px;
}
.publish-title :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1px #5b8def inset;
}
.publish-title :deep(.el-input__inner) {
  font-size: 15px;
  font-weight: 600;
}
.publish-textarea :deep(.el-textarea__inner) {
  font-size: 14px;
  border: none;
  background: #f7f8fa;
  padding: 12px;
  box-shadow: none;
}
.publish-textarea :deep(.el-textarea__inner:focus) {
  background: #fff;
  border: 1px solid #5b8def;
}
.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0;
}
.publish-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}
.publish-tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #8a919f;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s;
}
.tool:hover {
  background: #f0f5ff;
  color: #5b8def;
}
.tag-label {
  font-size: 12px;
  color: #8a919f;
  margin-left: 8px;
}
.tag-chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  background: #f2f3f5;
  color: #4e5969;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.tag-chip:hover {
  background: #e8f0ff;
  color: #5b8def;
}
.tag-chip.active {
  background: #5b8def;
  color: #fff;
}
.custom-tag-input {
  width: 110px;
}
.publish-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
