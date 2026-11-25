import request from './request'

// 根据 ID 获取用户信息（公开资料：昵称/头像/简介/等级等）
export const getUserById = (userId) => request.get(`/user/${userId}`)
