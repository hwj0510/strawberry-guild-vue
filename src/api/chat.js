import request from './request'

// 会话列表（聚合对方信息、最后消息、未读数）
export const getConversations = () => request.get('/chat/conversations')

// 与某用户的消息（分页，正序）
export const getMessages = (peerId, params = {}) =>
  request.get('/chat/messages', { params: { peerId, ...params } })

// 标记收到的来自 peerId 的消息为已读
export const markRead = (peerId) =>
  request.put('/chat/read', null, { params: { peerId } })

// 当前用户未读消息总数
export const getUnreadCount = () => request.get('/chat/unread-count')

// REST 兜底发送（主路径是 WebSocket）
export const sendMessageRest = (toUserId, content) =>
  request.post('/chat/send', { toUserId, content })
