import request from './request'

/** 通知列表 + 未读数 */
export const getNotifications = (params = {}) => request.get('/notifications', { params })

/** 未读数量 */
export const getUnreadCount = () => request.get('/notifications/unread-count')

/** 标记单条已读 */
export const markNotificationRead = (id) => request.put(`/notifications/${id}/read`)

/** 全部标记已读 */
export const markAllNotificationsRead = () => request.put('/notifications/read-all')

/** 管理员发送通知 + 邮件 */
export const adminSendNotification = (data) => request.post('/notifications/admin/send', data)
