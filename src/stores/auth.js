import { reactive, readonly } from 'vue'

// 登录态单例：token + userInfo，刷新不丢失（localStorage 持久化）
function safeParse(str) {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const authState = reactive({
  token: localStorage.getItem('sg_token') || '',
  refreshToken: localStorage.getItem('sg_refresh_token') || '',
  userInfo: safeParse(localStorage.getItem('sg_user')),
})

export function isLoggedIn() {
  return !!authState.token
}

export function setAuth(token, userInfo, refreshToken = '') {
  authState.token = token
  authState.refreshToken = refreshToken
  authState.userInfo = userInfo
  localStorage.setItem('sg_token', token)
  localStorage.setItem('sg_refresh_token', refreshToken)
  localStorage.setItem('sg_user', JSON.stringify(userInfo))
}

export function setUserInfo(userInfo) {
  authState.userInfo = userInfo
  localStorage.setItem('sg_user', JSON.stringify(userInfo))
}

export function clearAuth() {
  authState.token = ''
  authState.refreshToken = ''
  authState.userInfo = null
  localStorage.removeItem('sg_token')
  localStorage.removeItem('sg_refresh_token')
  localStorage.removeItem('sg_user')
}

// 对外暴露只读状态，避免组件误改
export const authStateRO = readonly(authState)
