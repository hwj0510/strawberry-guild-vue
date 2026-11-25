<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCurrentUser, updateProfile } from '@/api/auth'
import { getMyPosts, updatePost, deletePost, toggleLike, toggleCollect } from '@/api/post'
import { setUserInfo } from '@/stores/auth'
import { avatarColor, avatarText } from '@/utils/avatar'
import { normalizePost } from '@/composables/useHomeFeed'
import PostCard from '@/components/PostCard.vue'

const MY_PAGE_SIZE = 10
const router = useRouter()

const activeTab = ref('profile')

const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const loadError = ref(false)
const profile = ref({})
const form = reactive({
  nickname: '',
  email: '',
  bio: '',
  gender: 0,
})

const displayName = computed(() => form.nickname || profile.value.username || '莓友')
const joinedAt = computed(() => formatDate(profile.value.createTime))

const rules = {
  nickname: [
    {
      validator: (_, value, callback) => {
        const nickname = value?.trim() || ''
        if (!nickname) return callback(new Error('请输入昵称'))
        if (nickname.length > 30) return callback(new Error('昵称不能超过 30 个字符'))
        callback()
      },
      trigger: 'blur',
    },
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
    { max: 100, message: '邮箱不能超过 100 个字符', trigger: 'blur' },
  ],
  bio: [{ max: 500, message: '个人简介不能超过 500 个字符', trigger: 'blur' }],
}

function applyProfile(data) {
  profile.value = data || {}
  form.nickname = data?.nickname || ''
  form.email = data?.email || ''
  form.bio = data?.bio || ''
  form.gender = data?.gender ?? 0
  nextTick(() => formRef.value?.clearValidate())
}

async function loadProfile() {
  if (loading.value) return
  loading.value = true
  loadError.value = false
  try {
    const data = await getCurrentUser()
    applyProfile(data)
    setUserInfo(data)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || saving.value) return

  saving.value = true
  try {
    const data = await updateProfile({
      nickname: form.nickname.trim(),
      email: form.email.trim() || null,
      bio: form.bio.trim(),
      gender: form.gender,
    })
    applyProfile(data)
    setUserInfo(data)
    ElMessage.success('个人资料已保存')
  } catch {
    // 错误提示由请求拦截器统一处理，保留当前输入
  } finally {
    saving.value = false
  }
}

function resetProfile() {
  applyProfile(profile.value)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN')
}

// ==================== 我的帖子 ====================
const myPosts = ref([])
const myPostsLoading = ref(false)
const myPostsError = ref(false)
const myPage = ref(1)
const myHasMore = ref(false)
const myLoadingMore = ref(false)
let myPostsLoaded = false

async function fetchMyPosts(append = false) {
  if (append && (myLoadingMore.value || !myHasMore.value)) return
  if (append) {
    myLoadingMore.value = true
  } else {
    myPostsLoading.value = true
    myPage.value = 1
  }
  myPostsError.value = false

  try {
    const data = await getMyPosts({ page: myPage.value, size: MY_PAGE_SIZE })
    const rawList = Array.isArray(data) ? data : data?.list || []
    const list = rawList.map(normalizePost)
    myHasMore.value = Array.isArray(data)
      ? rawList.length === MY_PAGE_SIZE
      : myPage.value * MY_PAGE_SIZE < (data?.total || 0)
    myPosts.value = append ? [...myPosts.value, ...list] : list
    myPostsLoaded = true
  } catch {
    if (!append) {
      myPosts.value = []
      myHasMore.value = false
      myPostsError.value = true
    }
  } finally {
    myPostsLoading.value = false
    myLoadingMore.value = false
  }
}

function loadMoreMyPosts() {
  if (myLoadingMore.value || !myHasMore.value) return
  myPage.value += 1
  fetchMyPosts(true)
}

watch(activeTab, (value) => {
  if (value === 'posts' && !myPostsLoaded) fetchMyPosts()
})

// 编辑帖子
const editVisible = ref(false)
const editSaving = ref(false)
const editFormRef = ref()
const editForm = reactive({ id: null, title: '', content: '', category: '推荐' })
const editRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { max: 200, message: '标题不能超过 200 个字符', trigger: 'blur' },
  ],
  content: [{ required: true, message: '请输入正文', trigger: 'blur' }],
}

function openEdit(post) {
  editForm.id = post.id
  editForm.title = post.title
  editForm.content = post.content
  editForm.category = post.category || '推荐'
  editVisible.value = true
  nextTick(() => editFormRef.value?.clearValidate())
}

async function saveEdit() {
  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid || editSaving.value) return

  editSaving.value = true
  try {
    await updatePost(editForm.id, {
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      category: editForm.category,
    })
    const target = myPosts.value.find((item) => String(item.id) === String(editForm.id))
    if (target) {
      target.title = editForm.title.trim()
      target.content = editForm.content.trim()
      target.category = editForm.category
    }
    editVisible.value = false
    ElMessage.success('帖子已更新')
  } catch {
    // 失败保留编辑内容
  } finally {
    editSaving.value = false
  }
}

// 删除帖子
async function removePost(post) {
  try {
    await ElMessageBox.confirm(
      `确定删除帖子「${post.title || '无标题'}」吗？删除后无法恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  try {
    await deletePost(post.id)
    myPosts.value = myPosts.value.filter((item) => String(item.id) !== String(post.id))
    ElMessage.success('帖子已删除')
  } catch {
    // 失败提示由拦截器统一处理
  }
}

async function handleMyPostLike(id) {
  const post = myPosts.value.find((item) => String(item.id) === String(id))
  if (!post) return
  try {
    const result = await toggleLike(id)
    post.liked = result.liked
    post.likes = result.likeCount
  } catch {
    // 保留原状态
  }
}

async function handleMyPostCollect(id) {
  const post = myPosts.value.find((item) => String(item.id) === String(id))
  if (!post) return
  try {
    const result = await toggleCollect(id)
    post.collected = result.collected
    post.collects = result.collectCount
  } catch {
    // 保留原状态
  }
}

function openMyPost(id) {
  router.push({ path: '/', query: { postId: String(id) } })
}

onMounted(loadProfile)
</script>

<template>
  <div class="profile-page">
    <div class="page-heading">
      <h1>个人中心</h1>
      <p>管理你的账号资料和发布的帖子</p>
    </div>

    <el-tabs v-model="activeTab" class="profile-tabs">
      <el-tab-pane label="基本资料" name="profile">
        <el-alert
          v-if="loadError"
          title="资料加载失败，请检查网络后重试"
          type="error"
          :closable="false"
          show-icon
          class="load-alert"
        >
          <el-button size="small" @click="loadProfile">重新加载</el-button>
        </el-alert>

        <div v-loading="loading" class="profile-card">
          <section class="profile-summary">
            <el-avatar
              :size="88"
              :src="profile.avatar || undefined"
              :style="{ background: avatarColor(displayName) }"
              class="profile-avatar"
            >
              {{ avatarText(displayName) }}
            </el-avatar>
            <h2>{{ displayName }}</h2>
            <span class="level-badge">Lv.{{ profile.level ?? 1 }}</span>
            <dl class="account-meta">
              <div>
                <dt>用户名</dt>
                <dd>{{ profile.username || '-' }}</dd>
              </div>
              <div>
                <dt>注册时间</dt>
                <dd>{{ joinedAt }}</dd>
              </div>
            </dl>
          </section>

          <section class="profile-form-section">
            <div class="section-title">基本资料</div>
            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              :disabled="loading || loadError"
              label-position="top"
              class="profile-form"
              @submit.prevent
            >
              <el-form-item label="昵称" prop="nickname" required>
                <el-input
                  v-model="form.nickname"
                  maxlength="30"
                  show-word-limit
                  placeholder="请输入昵称"
                />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input
                  v-model="form.email"
                  maxlength="100"
                  placeholder="请输入邮箱，可用于接收联系信息"
                  clearable
                />
              </el-form-item>
              <el-form-item label="性别" prop="gender">
                <el-radio-group v-model="form.gender">
                  <el-radio-button :value="0">保密</el-radio-button>
                  <el-radio-button :value="1">男</el-radio-button>
                  <el-radio-button :value="2">女</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="个人简介" prop="bio">
                <el-input
                  v-model="form.bio"
                  type="textarea"
                  :rows="5"
                  maxlength="500"
                  show-word-limit
                  placeholder="介绍一下自己，让大家更了解你"
                />
              </el-form-item>
              <div class="form-actions">
                <el-button :disabled="saving" @click="resetProfile">重置</el-button>
                <el-button type="primary" :loading="saving" @click="saveProfile">保存修改</el-button>
              </div>
            </el-form>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane label="我的帖子" name="posts">
        <el-alert
          v-if="myPostsError"
          title="帖子加载失败，请稍后重试"
          type="error"
          :closable="false"
          show-icon
          class="load-alert"
        >
          <el-button size="small" @click="fetchMyPosts()">重新加载</el-button>
        </el-alert>

        <div v-loading="myPostsLoading" class="my-posts">
          <PostCard
            v-for="post in myPosts"
            :key="post.id"
            :post="post"
            manageable
            @like="handleMyPostLike"
            @collect="handleMyPostCollect"
            @edit="openEdit"
            @delete="removePost"
            @open="openMyPost"
          />

          <el-empty
            v-if="!myPostsLoading && !myPostsError && !myPosts.length"
            description="你还没有发布过帖子"
          />

          <div v-if="myHasMore && !myPostsLoading && myPosts.length" class="load-more">
            <el-button :loading="myLoadingMore" @click="loadMoreMyPosts">加载更多</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editVisible" title="编辑帖子" width="620px" :close-on-click-modal="false">
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="标题" prop="title" required>
          <el-input v-model="editForm.title" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="正文" prop="content" required>
          <el-input v-model="editForm.content" type="textarea" :rows="8" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-radio-group v-model="editForm.category">
            <el-radio-button value="推荐">推荐</el-radio-button>
            <el-radio-button value="游戏">游戏</el-radio-button>
            <el-radio-button value="影视">影视</el-radio-button>
            <el-radio-button value="AI">AI</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="editSaving" @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 920px;
  margin: 0 auto;
  padding: 8px 0 24px;
}
.page-heading {
  margin-bottom: 8px;
}
.page-heading h1 {
  margin: 0 0 6px;
  font-size: 24px;
  color: #1f2329;
}
.page-heading p {
  margin: 0;
  color: #8a919f;
  font-size: 14px;
}
.profile-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
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
.profile-card {
  min-height: 480px;
  display: grid;
  grid-template-columns: 250px 1fr;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(31, 35, 41, 0.04);
}
.profile-summary {
  padding: 40px 24px;
  text-align: center;
  background: linear-gradient(180deg, #f0f5ff 0%, #fff 72%);
  border-right: 1px solid #f0f1f3;
}
.profile-avatar {
  color: #fff;
  font-size: 32px;
  font-weight: 600;
  box-shadow: 0 5px 18px rgba(91, 141, 239, 0.2);
}
.profile-summary h2 {
  margin: 16px 0 8px;
  font-size: 20px;
  color: #1f2329;
  overflow-wrap: anywhere;
}
.level-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  background: #e8f0ff;
  color: #5b8def;
  font-size: 12px;
  font-weight: 600;
}
.account-meta {
  margin: 32px 0 0;
  text-align: left;
  font-size: 13px;
}
.account-meta > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid #f0f1f3;
}
.account-meta dt {
  color: #8a919f;
}
.account-meta dd {
  margin: 0;
  color: #4e5969;
  overflow-wrap: anywhere;
}
.profile-form-section {
  padding: 28px 36px 32px;
}
.section-title {
  margin-bottom: 22px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f1f3;
  color: #1f2329;
  font-size: 17px;
  font-weight: 600;
}
.profile-form {
  max-width: 480px;
}
.profile-form :deep(.el-form-item__label) {
  color: #4e5969;
  font-weight: 500;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
.my-posts {
  min-height: 300px;
}
.my-posts :deep(.el-empty) {
  padding: 56px 20px;
  background: #fff;
  border-radius: 12px;
}
.load-more {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}
@media (max-width: 720px) {
  .profile-card {
    grid-template-columns: 1fr;
  }
  .profile-summary {
    padding: 28px 20px;
    border-right: none;
    border-bottom: 1px solid #f0f1f3;
  }
  .account-meta {
    max-width: 360px;
    margin: 20px auto 0;
  }
  .profile-form-section {
    padding: 24px 20px;
  }
}
</style>
