import request from './request'

// 提交用户反馈
export const createFeedback = (data) => request.post('/feedback', data)
