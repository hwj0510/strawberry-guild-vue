import request from './request'

// 首页帖子列表（推荐/关注/分类/搜索/排序/分页）
export const getPosts = (params) => request.get('/posts', { params })

// 帖子数量（可按分类统计）
export const getPostCount = (category) =>
  request.get('/posts/count', { params: category ? { category } : {} })

// 当前用户收藏的帖子
export const getCollectedPosts = (params = {}) =>
  request.get('/posts', { params: { ...params, feed: 'collected' } })

// 发布帖子
export const createPost = (data) => request.post('/posts', data)

// 当前用户发布的帖子
export const getMyPosts = (params = {}) => request.get('/posts/mine', { params })

// 指定用户公开发布的帖子
export const getUserPosts = (userId, params = {}) =>
  request.get(`/posts/user/${userId}`, { params })

// 编辑自己的帖子
export const updatePost = (id, data) => request.put(`/posts/${id}`, data)

// 删除自己的帖子
export const deletePost = (id) => request.delete(`/posts/${id}`)

// 点赞 / 取消点赞（切换式）
export const toggleLike = (id) => request.post(`/posts/${id}/like`)

// 收藏 / 取消收藏（切换式）
export const toggleCollect = (id) => request.post(`/posts/${id}/collect`)

// 全站热榜
export const getHotTopics = (limit = 10, category) =>
  request.get('/hot', { params: category ? { limit, category } : { limit } })

// 标签列表
export const getTags = (params) => request.get('/tags', { params })

// 帖子详情（后端会累计一次浏览量）
export const getPostDetail = (id) => request.get(`/posts/${id}`)

// 评论列表
export const getComments = (id) => request.get(`/posts/${id}/comments`)

// 发表评论
export const createComment = (id, data) => request.post(`/posts/${id}/comments`, data)
