import request from './request'
import { setAuth, clearAuth, authState } from '@/stores/auth'

/**
 * 认证接口：与后端 cn.hwjcode.straberryguild.user.controller.UserController 对齐
 * 基础路径：/api/user
 */

// 登录：账号可以是用户名或邮箱，后端只返回 Token
export async function login({ account, password }) {
  const data = await request.post('/user/login', { account, password })
  setAuth(data.accessToken, null, data.refreshToken)
  // TokenResponse 不含用户信息，登录后单独拉取
  const userInfo = await getCurrentUser()
  setAuth(data.accessToken, userInfo, data.refreshToken)
  return userInfo
}

// 注册
export async function register({ username, password, confirmPassword, nickname, email }) {
  return request.post('/user/register', {
    username,
    password,
    confirmPassword,
    nickname,
    email,
  })
}

// 退出登录：后端无登出接口（JWT 无状态），只清理本地登录态
export async function logout() {
  clearAuth()
}

// 忘记密码 - 校验账号与注册邮箱是否匹配
export const verifyIdentity = (data) =>
  request.post('/user/forgot-password/verify', data)

// 忘记密码 - 校验通过后重置密码
export const resetPassword = (data) =>
  request.post('/user/forgot-password/reset', data)

// 获取当前登录用户（刷新页面后恢复登录态）
export async function getCurrentUser() {
  return request.get('/user/me')
}

// 更新当前用户个人资料
export async function updateProfile(data) {
  return request.put('/user/profile', data)
}

// 关注 / 取消关注用户（切换式）
export const toggleFollow = (userId) => request.post(`/user/${userId}/follow`)

// 刷新 Token
export async function refreshToken() {
  if (!authState.refreshToken) throw new Error('无可用的 Refresh Token')
  const data = await request.post('/user/refresh', { refreshToken: authState.refreshToken })
  setAuth(data.accessToken, authState.userInfo, data.refreshToken)
  return data.accessToken
}
