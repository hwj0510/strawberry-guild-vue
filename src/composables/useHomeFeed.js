import { ref } from 'vue'
import {
  getPosts,
  createPost,
  toggleLike as apiToggleLike,
  toggleCollect as apiToggleCollect,
  getHotTopics,
  getTags,
} from '@/api/post'
import { toggleFollow as apiToggleFollow } from '@/api/auth'

const PAGE_SIZE = 10

/**
 * 首页信息流
 * 与后端 PostController / HotController / TagController 的实际契约对齐
 */
export function useHomeFeed() {
  const posts = ref([])
  const hotTopics = ref([])
  const tagOptions = ref([])

  const loading = ref(false)
  const loadingMore = ref(false)
  const publishing = ref(false)

  const page = ref(1)
  const hasMore = ref(false)

  // 请求序号：切换 Tab / 搜索时丢弃过期响应，避免列表串数据
  let seq = 0

  function buildParams({ tabRef, keyword }) {
    const params = { page: page.value, size: PAGE_SIZE }
    if (keyword) params.keyword = keyword
    if (tabRef === 'follow') {
      params.feed = 'follow'
    } else if (['游戏', '影视', 'AI'].includes(tabRef)) {
      params.category = tabRef
    }
    return params
  }

  async function fetchList({ tabRef, keyword, append = false } = {}) {
    if (append && (loadingMore.value || !hasMore.value)) return

    const current = ++seq
    if (append) loadingMore.value = true
    else {
      loading.value = true
      page.value = 1
    }

    try {
      const data = await getPosts(buildParams({ tabRef, keyword }))
      if (current !== seq) return

      const rawList = Array.isArray(data) ? data : data?.list || []
      const list = rawList.map(normalizePost)

      // 后端列表接口返回纯数组，无 total，用「是否满一页」判断还有没有更多
      hasMore.value = Array.isArray(data)
        ? rawList.length === PAGE_SIZE
        : page.value * PAGE_SIZE < (data?.total || 0)

      posts.value = append ? [...posts.value, ...list] : list
    } catch {
      if (current !== seq) return
      if (!append) {
        posts.value = []
        hasMore.value = false
      }
    } finally {
      if (current === seq) {
        loading.value = false
        loadingMore.value = false
      }
    }
  }

  async function loadMore(ctx) {
    if (loadingMore.value || !hasMore.value) return
    page.value += 1
    await fetchList({ ...ctx, append: true })
  }

  async function fetchHot() {
    try {
      const data = await getHotTopics(10)
      const list = Array.isArray(data) ? data : []
      hotTopics.value = list.map((item, index) => ({
        rank: index + 1,
        postId: item.id,
        title: item.title,
        heat: String(item.viewCount ?? 0),
      }))
    } catch {
      hotTopics.value = []
    }
  }

  async function fetchTags() {
    try {
      const data = await getTags()
      tagOptions.value = Array.isArray(data) ? data : []
    } catch {
      // 标签接口异常时回退到本地预设标签
      tagOptions.value = []
    }
  }

  // 发帖：标签名直接传给后端，后端会自动创建不存在的标签
  async function publish({ title, content, tags = [] }) {
    publishing.value = true
    try {
      return await createPost({
        title: title.trim(),
        content: content.trim(),
        category: inferCategory(tags),
        tags,
      })
    } finally {
      publishing.value = false
    }
  }

  // 点赞：乐观更新，失败回滚
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

  // 收藏：乐观更新，失败回滚
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

  // 关注 / 取消关注：同作者的所有卡片同步状态
  async function handleFollow(authorId) {
    const targets = posts.value.filter((p) => String(p.authorId) === String(authorId))
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

  return {
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
  }
}

// 后端 PostListVO / PostDetailVO -> 前端帖子卡片结构
export function normalizePost(raw) {
  const author = raw.author || {}
  return {
    id: raw.id,
    title: raw.title || '',
    content: raw.content || '',
    category: raw.category || '推荐',
    cover: raw.cover || '',
    images: raw.images || [],
    tags: (raw.tags || [])
      .map((t) => (typeof t === 'string' ? t : t?.name))
      .filter(Boolean),
    tagIds: (raw.tags || [])
      .map((t) => (typeof t === 'string' ? null : t?.id))
      .filter(Boolean),
    author: author.nickname || author.username || '匿名用户',
    authorId: author.id ?? raw.authorId ?? null,
    avatar: author.avatar || '',
    level: author.level ?? 1,
    following: author.following ?? false,
    likes: raw.likeCount ?? raw.likes ?? 0,
    comments: raw.commentCount ?? raw.comments ?? 0,
    collects: raw.collectCount ?? raw.collects ?? 0,
    shares: raw.shareCount ?? raw.shares ?? 0,
    views: raw.viewCount ?? raw.views ?? 0,
    liked: raw.liked ?? false,
    collected: raw.collected ?? false,
    createdAt: toTimestamp(raw.createTime ?? raw.createdAt),
  }
}

function toTimestamp(value) {
  if (!value) return Date.now()
  if (typeof value === 'number') return value
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? Date.now() : ts
}

function inferCategory(tags = []) {
  if (tags.includes('游戏')) return '游戏'
  if (tags.includes('影视')) return '影视'
  if (tags.includes('AI')) return 'AI'
  return '推荐'
}
