// 将时间戳格式化为友好的相对时间
export function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 30 * day) return `${Math.floor(diff / day)}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 数字格式化：12000 -> 1.2万
export function formatCount(n) {
  if (n == null) return 0
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n
}
