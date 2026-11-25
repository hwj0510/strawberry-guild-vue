import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { clearAuth } from '@/stores/auth'

// 请求实例：后端基础地址优先读环境变量 VITE_API_BASE，开发期走 /api 代理（见 vite.config.js）
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 15000,
})

// 请求拦截：自动注入 token
service.interceptors.request.use((config) => {
  const token = localStorage.getItem('sg_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一解析 { code, message, data } 包装，只把 data 返回给业务层
service.interceptors.response.use(
  (response) => {
    // 文件流等非 JSON 响应直接返回
    if (response.config.responseType === 'blob') return response
    const res = response.data
    if (res.code === 200 || res.code === 0) {
      return res.data
    }
    // 后端未登录 / Token 过期可能是 HTTP 200 + code 401，这里一并处理
    if (res.code === 401) {
      handleUnauthorized()
      return Promise.reject(withHandled(new Error(res.message || '未登录')))
    }
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(withHandled(new Error(res.message || 'Error')))
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized()
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络异常')
    }
    return Promise.reject(withHandled(error))
  }
)

// 标记已提示过的错误，调用方无需重复弹提示
function withHandled(err) {
  err.handled = true
  return err
}

let redirecting = false
function handleUnauthorized() {
  clearAuth()
  ElMessage.warning('登录已过期，请重新登录')
  if (redirecting || router.currentRoute.value.path === '/login') return
  redirecting = true
  router.push('/login').finally(() => {
    redirecting = false
  })
}

export default service
