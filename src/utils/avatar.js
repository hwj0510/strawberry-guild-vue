// 根据用户名生成稳定的头像背景色与首字母
const palette = [
  '#5B8DEF', '#F56C6C', '#67C23A', '#E6A23C', '#9B59B6',
  '#1ABC9C', '#34495E', '#F39C12', '#16A085', '#E91E63',
]

export function avatarColor(name) {
  const str = String(name || '?')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

export function avatarText(name) {
  return String(name || '?').trim().charAt(0).toUpperCase()
}
