<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createFeedback } from '@/api/feedback'
import { authStateRO } from '@/stores/auth'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const route = useRoute()
const formRef = ref()
const submitting = ref(false)
const form = reactive({
  type: 'BUG',
  content: '',
  contact: '',
})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (!submitting.value) emit('update:modelValue', value)
  },
})

const rules = {
  content: [
    {
      validator: (_, value, callback) => {
        const content = value?.trim() || ''
        if (!content) return callback(new Error('请填写反馈内容'))
        if (content.length > 1000) return callback(new Error('反馈内容不能超过 1000 个字符'))
        callback()
      },
      trigger: 'blur',
    },
  ],
  contact: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
    { max: 100, message: '邮箱不能超过 100 个字符', trigger: 'blur' },
  ],
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    form.contact = authStateRO.userInfo?.email || form.contact
    nextTick(() => formRef.value?.clearValidate())
  }
)

async function submitFeedback() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || submitting.value) return

  submitting.value = true
  try {
    await createFeedback({
      type: form.type,
      content: form.content.trim(),
      contact: form.contact.trim() || null,
      pageUrl: route.fullPath,
    })
    ElMessage.success('反馈已提交，感谢你的建议')
    resetForm()
    emit('update:modelValue', false)
  } catch {
    // 提交失败保留输入，错误由请求拦截器统一提示
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.type = 'BUG'
  form.content = ''
  form.contact = ''
  nextTick(() => formRef.value?.clearValidate())
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="用户反馈"
    width="520px"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    class="feedback-dialog"
  >
    <p class="feedback-intro">告诉我们你遇到的问题或希望增加的功能。</p>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <el-form-item label="反馈类型" prop="type">
        <el-radio-group v-model="form.type" :disabled="submitting">
          <el-radio-button value="BUG">问题反馈</el-radio-button>
          <el-radio-button value="FEATURE">功能建议</el-radio-button>
          <el-radio-button value="OTHER">其他</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="反馈内容" prop="content" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="6"
          maxlength="1000"
          show-word-limit
          :disabled="submitting"
          placeholder="请详细描述问题、建议或你的使用体验"
        />
      </el-form-item>
      <el-form-item label="联系邮箱（选填）" prop="contact">
        <el-input
          v-model="form.contact"
          maxlength="100"
          :disabled="submitting"
          placeholder="方便我们向你了解后续处理情况"
          clearable
        />
      </el-form-item>
      <p class="page-tip">提交时会附带当前页面路径，帮助我们更快定位问题。</p>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submitFeedback">提交反馈</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.feedback-intro {
  margin: -4px 0 20px;
  color: #8a919f;
  font-size: 13px;
  line-height: 1.6;
}
.feedback-dialog :deep(.el-form-item__label) {
  color: #4e5969;
  font-weight: 500;
}
.page-tip {
  margin: -4px 0 0;
  color: #a0a6b1;
  font-size: 12px;
}
@media (max-width: 600px) {
  .feedback-dialog :deep(.el-dialog) {
    width: calc(100% - 32px);
  }
}
</style>
