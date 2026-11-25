// 将后端返回的时间值统一转为毫秒时间戳
// 兼容：时间戳数字 / ISO 字符串 / Jackson JavaTime 数组 [y,m,d,h,mi,s,ns]
export function toTimestamp(v) {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return 0
  if (typeof v === 'string') {
    const t = Date.parse(v)
    return Number.isNaN(t) ? 0 : t
  }
  if (Array.isArray(v) && v.length >= 3) {
    const [y, m, d, h = 0, mi = 0, s = 0, ns = 0] = v
    const ms = Math.floor((ns || 0) / 1e6)
    const t = new Date(y, (m || 1) - 1, d || 1, h, mi, s, ms).getTime()
    return Number.isNaN(t) ? 0 : t
  }
  const t = Date.parse(String(v))
  return Number.isNaN(t) ? 0 : t
}

const pad = (n) => String(n).padStart(2, '0')

// 气泡时间：HH:mm
export function formatClock(v) {
  const ts = toTimestamp(v)
  if (!ts) return ''
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 会话列表时间：今天 HH:mm / 昨天 / M/D
export function formatListTime(v) {
  const ts = toTimestamp(v)
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
