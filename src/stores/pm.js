import { reactive, computed } from 'vue'
import {
  getConversations,
  getMessages,
  markRead,
  getUnreadCount,
  sendMessageRest,
} from '@/api/chat'
import { ws } from '@/utils/ws'
import { authStateRO, isLoggedIn } from '@/stores/auth'
import { toTimestamp } from '@/utils/time'

/**
 * 私聊（实时）状态 store
 * 数据来源：REST 拉取历史 + WebSocket 实时推送；发送优先走 WebSocket，未连接时 REST 兜底。
 */

const state = reactive({
  /** peerId -> 会话条目 */
  conversations: {},
  /** peerId -> 消息数组（正序：旧 -> 新） */
  messages: {},
  /** peerId -> 是否已加载过历史 */
  loadedPeers: {},
  activePeerId: null,
  unreadTotal: 0,
  connected: false,
  ready: false,
})

let bootstrapped = false
const unbind = []

function currentUserId() {
  return authStateRO.userInfo?.id
}
function peerKey(peerId) {
  return String(peerId)
}
function recomputeUnread() {
  state.unreadTotal = Object.values(state.conversations).reduce(
    (sum, c) => sum + (c.unread || 0),
    0
  )
}

export const pmConversationList = computed(() =>
  [...Object.values(state.conversations)].sort(
    (a, b) => toTimestamp(b.lastMessageTime) - toTimestamp(a.lastMessageTime)
  )
)
export const pmUnreadTotal = computed(() => state.unreadTotal)
export const pmConnected = computed(() => state.connected)
export const pmState = state

export function pmGetMessages(peerId) {
  return state.messages[peerKey(peerId)] || []
}

export function pmGetConversation(peerId) {
  return state.conversations[peerKey(peerId)] || null
}

export async function pmLoadConversations() {
  if (!isLoggedIn()) return
  try {
    const list = (await getConversations()) || []
    // 合并而不是整体替换：保留本地占位的会话（还没发过消息、库里暂无记录的），
    // 否则在途的空列表返回会把 openFromQuery 刚建好的占位会话冲掉，导致聊天框不渲染
    const map = { ...state.conversations }
    list.forEach((c) => {
      map[peerKey(c.peerId)] = c
    })
    state.conversations = map
    recomputeUnread()
  } catch {
    /* 静默失败 */
  }
  state.ready = true
}

export async function pmRefreshUnread() {
  if (!isLoggedIn()) return
  try {
    const data = await getUnreadCount()
    state.unreadTotal = data?.count ?? 0
  } catch {
    /* 静默失败 */
  }
}

export async function pmLoadMessages(peerId, append = false) {
  const key = peerKey(peerId)
  if (!append) {
    state.messages[key] = []
    state.loadedPeers[key] = false
  }
  try {
    const page = append ? Math.floor((state.messages[key]?.length || 0) / 50) + 1 : 1
    const list = (await getMessages(peerId, { page, size: 50 })) || []
    state.messages[key] = append ? [...list, ...(state.messages[key] || [])] : list
    state.loadedPeers[key] = true
  } catch {
    /* 静默失败 */
  }
}

export async function pmSelectPeer(peerId) {
  const key = peerKey(peerId)
  state.activePeerId = key
  if (!state.loadedPeers[key]) {
    await pmLoadMessages(key)
  }
  const conv = state.conversations[key]
  if (conv && conv.unread) {
    conv.unread = 0
    recomputeUnread()
    try {
      await markRead(peerId)
    } catch {
      /* 静默失败 */
    }
    ws.send('read', { peerId: Number(peerId) })
  }
}

/** 从个人主页点私信时，先在本地列表占位（真正落库在发第一条消息时） */
export function pmEnsureConversation(user) {
  const key = peerKey(user.id)
  if (!state.conversations[key]) {
    state.conversations[key] = {
      conversationId: null,
      peerId: Number(user.id),
      peerName: user.name || user.nickname || '用户',
      peerAvatar: user.avatar || '',
      lastMessage: '',
      lastMessageTime: null,
      unread: 0,
    }
  } else {
    const c = state.conversations[key]
    if (user.name) c.peerName = user.name
    if (user.avatar) c.peerAvatar = user.avatar
  }
}

/** 发送消息：优先 WebSocket，连接未就绪走 REST 兜底 */
export async function pmSendMessage(peerId, text) {
  const content = String(text || '').trim()
  if (!content) return false
  const ok = ws.send('message', { toUserId: Number(peerId), content })
  if (!ok) {
    try {
      await sendMessageRest(Number(peerId), content)
      await pmLoadMessages(peerId)
      await pmLoadConversations()
      return true
    } catch {
      return false
    }
  }
  return true
}

/** 收到服务端推送的消息（收发双方都会收到同一条） */
function applyIncoming(data) {
  if (!data) return
  const me = currentUserId()
  const peerId = String(data.fromUserId) === String(me) ? data.toUserId : data.fromUserId
  const key = peerKey(peerId)

  // 追加（按 id 去重）
  const arr = state.messages[key] || []
  if (!arr.some((m) => m.id === data.id)) arr.push(data)
  state.messages[key] = arr

  let conv = state.conversations[key]
  const isNew = !conv
  if (!conv) {
    conv = {
      conversationId: data.conversationId,
      peerId: Number(peerId),
      peerName: '',
      peerAvatar: '',
      lastMessage: data.content,
      lastMessageTime: data.createdAt,
      unread: 0,
    }
    state.conversations[key] = conv
  } else {
    conv.conversationId = data.conversationId
    conv.lastMessage = data.content
    conv.lastMessageTime = data.createdAt
  }

  // 未读：我是接收方且当前没在看这个会话
  if (String(data.toUserId) === String(me) && state.activePeerId !== key) {
    conv.unread = (conv.unread || 0) + 1
    recomputeUnread()
  } else if (String(data.toUserId) === String(me) && state.activePeerId === key) {
    try {
      markRead(peerId)
    } catch {
      /* 静默失败 */
    }
  }

  // 新会话：刷新一次列表以拿到对方昵称/头像
  if (isNew) {
    pmLoadConversations()
  }
}

export function pmBootstrap() {
  if (!isLoggedIn()) return
  if (bootstrapped) {
    ws.connect()
    pmLoadConversations()
    return
  }
  bootstrapped = true
  unbind.push(
    ws.on('open', () => {
      state.connected = true
      pmLoadConversations()
    })
  )
  unbind.push(ws.on('close', () => (state.connected = false)))
  unbind.push(ws.on('error', () => (state.connected = false)))
  unbind.push(ws.on('message', applyIncoming))
  ws.connect()
  pmLoadConversations()
}

export function pmReset() {
  state.conversations = {}
  state.messages = {}
  state.loadedPeers = {}
  state.activePeerId = null
  state.unreadTotal = 0
  state.connected = false
  state.ready = false
  unbind.forEach((fn) => fn())
  unbind.length = 0
  bootstrapped = false
  ws.disconnect()
}
