import request from './request'

/** 草莓姬 AI 对话 */
export const chatAI = (data) => request.post('/ai/chat', data)
