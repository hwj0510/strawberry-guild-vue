import { isLoggedIn } from '@/stores/auth'

/** 极简事件总线 */
class WsEventBus {
  constructor() {
    this.listeners = new Map()
  }
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(fn)
    return () => this.off(type, fn)
  }
  off(type, fn) {
    this.listeners.get(type)?.delete(fn)
  }
  emit(type, data) {
    this.listeners.get(type)?.forEach((fn) => {
      try {
        fn(data)
      } catch (e) {
        console.error('[ws] 监听回调异常', e)
      }
    })
  }
}

/** 构造 WS 地址：优先用 VITE_API_BASE 推导后端 host，否则用当前 host（走 vite /ws 代理） */
function buildUrl() {
  const token = localStorage.getItem('sg_token') || ''
  const apiBase = import.meta.env.VITE_API_BASE
  let base
  if (apiBase) {
    try {
      const u = new URL(apiBase, window.location.origin)
      base = (u.protocol === 'https:' ? 'wss://' : 'ws://') + u.host
    } catch {
      base = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
    }
  } else {
    base = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host
  }
  return `${base}/ws/chat?token=${encodeURIComponent(token)}`
}

class WsClient {
  constructor() {
    this.bus = new WsEventBus()
    this.ws = null
    this.connected = false
    this.manualClose = false
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.backoff = 1000
  }

  connect() {
    if (!isLoggedIn()) return
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }
    this.manualClose = false
    let ws
    try {
      ws = new WebSocket(buildUrl())
    } catch (e) {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      this.connected = true
      this.backoff = 1000
      this.bus.emit('open')
      this.startHeartbeat()
    }
    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.type === 'pong') {
        this.bus.emit('pong')
        return
      }
      this.bus.emit(msg.type || 'message', msg.data ?? msg)
    }
    ws.onclose = () => {
      this.connected = false
      this.stopHeartbeat()
      this.bus.emit('close')
      if (!this.manualClose) this.scheduleReconnect()
    }
    ws.onerror = () => {
      this.bus.emit('error')
    }
  }

  disconnect() {
    this.manualClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        /* ignore */
      }
      this.ws = null
    }
    this.connected = false
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    try {
      this.ws.send(JSON.stringify({ type, ...payload }))
      return true
    } catch {
      return false
    }
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) this.send('ping')
    }, 25000)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  scheduleReconnect() {
    if (this.manualClose || this.reconnectTimer) return
    this.backoff = Math.min(this.backoff * 2, 30000)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, this.backoff)
  }

  on(type, fn) {
    return this.bus.on(type, fn)
  }
}

export const ws = new WsClient()
