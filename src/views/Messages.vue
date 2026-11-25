<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  pmConversationList,
  pmState,
  pmConnected,
  pmBootstrap,
  pmSelectPeer,
  pmSendMessage,
  pmGetMessages,
  pmGetConversation,
  pmEnsureConversation,
} from '@/stores/pm'
import { getUserById } from '@/api/user'
import { authStateRO } from '@/stores/auth'
import { avatarColor, avatarText } from '@/utils/avatar'
import { formatClock, formatListTime } from '@/utils/time'

const route = useRoute()
const me = computed(() => authStateRO.userInfo?.id)

const conversations = pmConversationList

const activePeer = computed({
  get: () => pmState.activePeerId,
  set: (v) => pmSelectPeer(v),
})

const activeConv = computed(() =>
  activePeer.value ? pmGetConversation(activePeer.value) : null
)

const messages = computed(() => (activePeer.value ? pmGetMessages(activePeer.value) : []))

const scrollEl = ref(null)
function scrollToBottom() {
  nextTick(() => {
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}
watch(messages, scrollToBottom)

const draft = ref('')
const sending = ref(false)
async function send() {
  const text = draft.value.trim()
  if (!text || !activePeer.value || sending.value) return
  sending.value = true
  const ok = await pmSendMessage(activePeer.value, text)
  sending.value = false
  if (ok) {
    draft.value = ''
    scrollToBottom()
  }
}

function isMine(m) {
  return String(m.fromUserId) === String(me.value)
}

// 从个人主页 / 其他入口跳过来时，预选指定会话（如不存在则拉取用户资料占位）
async function openFromQuery() {
  const peer = route.query.peer
  if (!peer) return
  const pid = String(peer)
  if (!pmGetConversation(pid)) {
    try {
      const u = await getUserById(pid)
      if (u) {
        pmEnsureConversation({ id: u.id || pid, name: u.nickname || u.username, avatar: u.avatar })
      }
    } catch {
      pmEnsureConversation({ id: pid, name: `用户${pid}`, avatar: '' })
    }
  }
  activePeer.value = pid
}

onMounted(() => {
  pmBootstrap()
  openFromQuery()
})

watch(
  () => route.query.peer,
  () => openFromQuery()
)
</script>

<template>
  <div class="messages-page">
    <div class="conv-panel">
      <div class="panel-head">
        <span>消息</span>
        <span class="conn" :class="{ on: pmConnected }" :title="pmConnected ? '已连接' : '连接中…'">
          <i class="dot"></i>{{ pmConnected ? '在线' : '离线' }}
        </span>
      </div>
      <div class="conv-list">
        <div
          v-for="c in conversations"
          :key="c.peerId"
          class="conv-item"
          :class="{ active: activePeer === String(c.peerId) }"
          @click="activePeer = String(c.peerId)"
        >
          <el-badge :value="c.unread" :hidden="!c.unread" :max="99" class="conv-badge">
            <el-avatar
              :size="42"
              :src="c.peerAvatar || undefined"
              :style="{ background: avatarColor(c.peerName) }"
            >{{ avatarText(c.peerName) }}</el-avatar>
          </el-badge>
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-name">{{ c.peerName || '用户' }}</span>
              <span class="conv-time">{{ formatListTime(c.lastMessageTime) }}</span>
            </div>
            <div class="conv-last">{{ c.lastMessage || '暂无消息' }}</div>
          </div>
        </div>
        <el-empty
          v-if="!conversations.length"
          description="还没有会话，去别人主页点个私信吧"
          :image-size="80"
        />
      </div>
    </div>

    <div class="chat-panel">
      <template v-if="activeConv">
        <div class="chat-head">
          <div class="chat-title">
            <span>{{ activeConv.peerName || '用户' }}</span>
            <span class="online-dot" :class="{ off: !pmConnected }"></span>
          </div>
        </div>

        <div ref="scrollEl" class="chat-body">
          <div
            v-for="m in messages"
            :key="m.id"
            class="msg-row"
            :class="isMine(m) ? 'mine' : 'theirs'"
          >
            <el-avatar
              v-if="!isMine(m)"
              :size="32"
              :src="activeConv.peerAvatar || undefined"
              :style="{ background: avatarColor(activeConv.peerName) }"
              class="msg-avatar"
            >{{ avatarText(activeConv.peerName) }}</el-avatar>
            <div class="bubble-wrap">
              <div class="bubble">{{ m.content }}</div>
              <div class="msg-time">{{ formatClock(m.createdAt) }}</div>
            </div>
          </div>
          <div v-if="!messages.length" class="chat-empty">还没有消息，打个招呼吧 👋</div>
        </div>

        <div class="chat-input">
          <el-input
            v-model="draft"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入消息，按 Ctrl/⌘ + Enter 发送"
            @keydown.ctrl.enter="send"
            @keydown.meta.enter="send"
          />
          <div class="input-actions">
            <el-button type="primary" :loading="sending" @click="send">发送</el-button>
          </div>
        </div>
      </template>
      <div v-else class="chat-placeholder">
        <el-empty description="选择左侧会话开始聊天" :image-size="120" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.messages-page {
  display: flex;
  height: calc(100vh - 110px);
  min-height: 480px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(31, 35, 41, 0.05);
}
.conv-panel {
  width: 300px;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
  padding: 16px 18px;
  border-bottom: 1px solid #f0f0f0;
  color: #1f2329;
}
.conn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 400;
  color: #b0b3b8;
}
.conn .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c9cdd4;
}
.conn.on {
  color: #67c23a;
}
.conn.on .dot {
  background: #67c23a;
}
.conv-list {
  flex: 1;
  overflow-y: auto;
}
.conv-item {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.15s;
}
.conv-item:hover {
  background: #f0f5ff;
}
.conv-item.active {
  background: #eaf1ff;
}
.conv-badge :deep(.el-badge__content) {
  border: none;
}
.conv-info {
  flex: 1;
  min-width: 0;
}
.conv-top {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 4px;
}
.conv-name {
  font-weight: 600;
  color: #1f2329;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conv-time {
  margin-left: auto;
  font-size: 11px;
  color: #b0b3b8;
  flex-shrink: 0;
}
.conv-last {
  font-size: 12px;
  color: #8a919f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.chat-head {
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.chat-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}
.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
  margin-left: 4px;
}
.online-dot.off {
  background: #c9cdd4;
}
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  max-width: 70%;
}
.msg-row.mine {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.msg-avatar {
  flex-shrink: 0;
  color: #fff;
  font-size: 12px;
}
.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.msg-row.theirs .bubble-wrap {
  align-items: flex-start;
}
.msg-row.mine .bubble-wrap {
  align-items: flex-end;
}
.bubble {
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}
.msg-row.theirs .bubble {
  background: #fff;
  color: #1f2329;
  border-top-left-radius: 2px;
  box-shadow: 0 1px 2px rgba(31, 35, 41, 0.06);
}
.msg-row.mine .bubble {
  background: #5b8def;
  color: #fff;
  border-top-right-radius: 2px;
}
.msg-time {
  font-size: 10px;
  color: #b0b3b8;
  padding: 0 2px;
}
.chat-empty {
  text-align: center;
  color: #a0a4aa;
  font-size: 13px;
  margin: auto;
}
.chat-input {
  border-top: 1px solid #f0f0f0;
  padding: 10px 16px;
  background: #fff;
}
.input-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.chat-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
@media (max-width: 640px) {
  .messages-page {
    flex-direction: column;
    height: auto;
    min-height: 60vh;
  }
  .conv-panel {
    width: 100%;
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }
  .msg-row {
    max-width: 85%;
  }
}
</style>
