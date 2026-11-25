<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Promotion, Delete, MagicStick, CopyDocument } from '@element-plus/icons-vue'
import aiGirl from '@/assets/ai-girl.jpg'
import { avatarColor, avatarText } from '@/utils/avatar'
import { authStateRO } from '@/stores/auth'
import { chatAI } from '@/api/ai'

const STORAGE_KEY = 'berry_ai_chat_v1'

/* ==================== 人格设定 ==================== */
const personas = [
  {
    id: 'healing',
    name: '治愈系',
    emoji: '🌸',
    desc: '温柔体贴的邻家姐姐，会认真听你说完每一句话，再轻轻接住你的情绪。',
    tags: ['温柔', '耐心', '会安慰人'],
    greeting: (n) =>
      `${n}，欢迎回来呀～我是草莓姬🍓 今天想聊游戏、电影，还是单纯想找个人说说话？我都在哦。`,
    tails: ['慢慢来，不着急～', '我会一直在这里陪你。', '今天也要好好照顾自己呀。', '想聊多久都可以哦。'],
    suggestions: ['最近有点累，陪我聊会儿', '推荐一部治愈系电影', '帮我挑一款适合新手的游戏', '给我一句晚安吧'],
    mood: { emoji: '🥰', text: '温柔地看着你' },
  },
  {
    id: 'genki',
    name: '元气少女',
    emoji: '⚡',
    desc: '元气满满的草莓学妹，聊两句就能把快乐传染给你，永远站在你这边！',
    tags: ['元气', '话痨', '捧场王'],
    greeting: (n) =>
      `${n}前辈！你来啦～～🍓 草莓姬今天也超有精神！快告诉我想聊什么，游戏电影八卦都可以，冲呀！`,
    tails: ['嘿嘿，被我猜中了吧！', '冲冲冲！', '前辈最棒啦～', '这可是草莓姬的独家情报哦！'],
    suggestions: ['推荐一款超爽的动作游戏', '给我来点快乐的电影', '夸夸我！', '今天有什么新鲜事'],
    mood: { emoji: '🤩', text: '眼睛闪闪发光' },
  },
  {
    id: 'tsundere',
    name: '傲娇学妹',
    emoji: '💢',
    desc: '嘴上嫌弃你，心里却很在意你的小傲娇。多聊几句就会露出真心。',
    tags: ['傲娇', '嘴硬', '反差萌'],
    greeting: (n) =>
      `哼，${n}你总算来了。我、我才没有一直等你呢！……既然来了，就勉强陪你聊会儿吧。`,
    tails: ['才、才不是为了你才说的呢！', '哼，下次别让我等太久。', '你可别误会了！', '……谢谢你来。'],
    suggestions: ['你是不是一直在等我', '推荐个游戏给我', '夸我一句会死吗', '晚安，傲娇鬼'],
    mood: { emoji: '😤', text: '别过脸偷看你' },
  },
  {
    id: 'otaku',
    name: '游戏宅',
    emoji: '🎮',
    desc: '开口就是攻略和梗的老玩家，聊游戏能聊到天亮，最近在补番。',
    tags: ['硬核', '玩梗', '攻略库'],
    greeting: (n) =>
      `${n}，上线啦！🎮 草莓姬刚打完一把，手感正热。要攻略、配装还是片单？报个名字，我直接开数据库！`,
    tails: ['这波稳了，交给我。', '需要我出个详细打法吗？', '老玩家不会骗你。', '记得存档再试！'],
    suggestions: ['艾尔登法环怎么打女武神', '推荐一款开放世界神作', '最近有什么必看番', '帮我配一套新手装备'],
    mood: { emoji: '🕹️', text: '手柄已经拿好了' },
  },
]

const AFFECTION_LEVELS = [
  { min: 0, label: '初次见面' },
  { min: 20, label: '逐渐熟悉' },
  { min: 45, label: '聊得来的朋友' },
  { min: 70, label: '有点心动' },
  { min: 90, label: '最好的搭档' },
]

/* ==================== 状态 ==================== */
const messages = ref([])
const input = ref('')
const thinking = ref(false)
const streaming = ref(false)
const listRef = ref(null)
const personaId = ref('healing')
const nickname = ref('')
const affection = ref(6)
const mood = reactive({ emoji: '🥰', text: '温柔地看着你' })

const currentPersona = computed(
  () => personas.find((p) => p.id === personaId.value) || personas[0]
)
const displayName = computed(
  () => nickname.value.trim() || authStateRO.userInfo?.nickname || authStateRO.userInfo?.username || '莓友'
)
const affectionLevel = computed(() => {
  let label = AFFECTION_LEVELS[0].label
  AFFECTION_LEVELS.forEach((l) => {
    if (affection.value >= l.min) label = l.label
  })
  return label
})
const suggestions = computed(() => currentPersona.value.suggestions)

const emojis = ['🍓', '💖', '✨', '🥰', '😭', '🤔', '🎮', '🎬', '🍰', '👀']

let streamTimer = null
let saveTimer = null

/* ==================== 持久化 ==================== */
function persist() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          personaId: personaId.value,
          nickname: nickname.value,
          affection: affection.value,
          messages: messages.value.map(({ role, text, time }) => ({ role, text, time })),
        })
      )
    } catch {
      // 忽略存储异常
    }
  }, 300)
}

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    if (data.personaId && personas.some((p) => p.id === data.personaId)) {
      personaId.value = data.personaId
    }
    nickname.value = data.nickname || ''
    if (typeof data.affection === 'number') affection.value = data.affection
    if (Array.isArray(data.messages) && data.messages.length) {
      messages.value = data.messages
        .filter((m) => m && typeof m.text === 'string')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'ai',
          // 兼容旧版本存档中的旧名字（避免把已是「草莓姬」的文本重复替换）
          text: m.text.replace(/(?<!草)莓姬/g, '草莓姬'),
          time: m.time || '',
        }))
      return true
    }
  } catch {
    // 数据损坏则忽略
  }
  return false
}

/* ==================== 消息渲染 ==================== */
function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (listRef.value) listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

function pushAiMessage(text, { instant = false } = {}) {
  const msg = reactive({ role: 'ai', text: '', time: now() })
  messages.value.push(msg)
  scrollToBottom()

  if (instant) {
    msg.text = text
    persist()
    return
  }

  streaming.value = true
  let index = 0
  clearInterval(streamTimer)
  streamTimer = setInterval(() => {
    index += 2
    msg.text = text.slice(0, index)
    scrollToBottom()
    if (index >= text.length) {
      clearInterval(streamTimer)
      streamTimer = null
      streaming.value = false
      persist()
    }
  }, 26)
}

function pushUserMessage(text) {
  messages.value.push({ role: 'user', text, time: now() })
  scrollToBottom()
  affection.value = Math.min(100, affection.value + 1)
  persist()
}

/* ==================== 回复引擎 ==================== */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function buildReply(text) {
  const t = text.toLowerCase()
  const n = displayName.value
  const p = currentPersona.value
  let body
  let nextMood = p.mood

  if (/你好|hi|hello|在吗|哈喽|嗨/.test(t)) {
    body = `${n}，我在的呀～刚刚还在想你会不会来。今天过得怎么样？`
  } else if (/累|难过|烦|emo|压力|焦虑|失眠/.test(t)) {
    body = `辛苦啦，${n}。先把肩膀放松一下，深呼吸三次。想说的话我都听着，不想说也没关系，我陪你安静待一会儿也好。`
    nextMood = { emoji: '🥺', text: '心疼地看着你' }
  } else if (/晚安|睡了|困/.test(t)) {
    body = `晚安，${n}。把今天没做完的事先放下吧，明天再一起解决。做个有草莓味的梦🍓`
    nextMood = { emoji: '😴', text: '轻声和你说晚安' }
  } else if (/喜欢你|爱你|心动|告白|老婆|可爱|好看/.test(t)) {
    body =
      personaId.value === 'tsundere'
        ? `你、你突然说这个干嘛啦！……不过，被${n}这么说，好像也不讨厌。`
        : `诶嘿嘿，${n}这样说我会当真的哦。那……以后也要多来陪我聊天呀。`
    nextMood = { emoji: '😳', text: '脸有点红' }
  } else if (/夸|表扬|厉害|棒/.test(t)) {
    body = `${n}才是真的厉害！能坚持自己喜欢的事，还愿意来和我分享，这一点就超棒的。`
    nextMood = { emoji: '🥰', text: '开心地晃着马尾' }
  } else if (/开放世界|塞尔达|巫师|原神|艾尔登|法环|大镖客/.test(t)) {
    body =
      '开放世界我会先推《艾尔登法环》和《塞尔达传说：王国之泪》：前者适合享受探索与挑战，后者适合自由解谜。想轻松一点就选《原神》，剧情向可以看《巫师 3》。你是偏探索、战斗还是剧情？我再帮你缩到一款。'
    nextMood = { emoji: '🤩', text: '眼睛亮起来了' }
  } else if (/boss|打法|配装|通关|卡关|攻略|女武神|只狼/.test(t)) {
    body =
      '先把 Boss 的攻击拆成“起手动作—伤害判定—收招硬直”三段。多数卡关不是伤害不够，而是贪刀。告诉我具体游戏和 Boss 名，我可以给你一套招式应对表、推荐配装和容错路线。'
    nextMood = { emoji: '🧐', text: '认真分析中' }
  } else if (/电影|影视|片单|沙丘|奥本海默|番|动漫|剧/.test(t)) {
    body =
      '按心情给你分三类：想震撼看《沙丘 2》，想沉浸看《奥本海默》，想轻松治愈可以看《葬送的芙莉莲》。要我用一句话帮你锁定今晚看哪部吗？'
    nextMood = { emoji: '🍿', text: '抱着爆米花' }
  } else if (/ai|写|评测|文案|提示词|总结/.test(t)) {
    body =
      '把素材给我：游戏名、亮点、缺点、目标读者。我可以先出“标题 3 个 + 开头钩子 + 三段式正文”的骨架，你再按自己语气润色，会比自己从零写快很多。'
    nextMood = { emoji: '✍️', text: '准备开始写' }
  } else if (/推荐|玩什么|看什么|不知道/.test(t)) {
    body = `那我来问三个小问题：${n}今天想要“爽快”“感动”还是“放松”？大概能投入多少时间？偏好单机还是联机？回答完我就给你精准推荐。`
  } else if (/谢谢|感谢|多谢|爱你哟/.test(t)) {
    body = `不用谢啦，能帮上${n}就是我今天的开心事。下次遇到难题也记得来找我。`
  } else {
    body = `${n}说的这个我记下啦。要不我们从两个方向聊：① 你想要具体攻略/推荐；② 只是想吐槽和放松。选一个，我马上接话。`
  }

  mood.emoji = nextMood.emoji
  mood.text = nextMood.text
  return `${body} ${pick(p.tails)}`
}

/* ==================== 交互 ==================== */
async function send(text) {
  const content = (text ?? input.value).trim()
  if (!content || thinking.value || streaming.value) return

  pushUserMessage(content)
  input.value = ''
  thinking.value = true

  const history = messages.value.map((m) => ({
    role: m.role === 'user' ? 'user' : 'ai',
    content: m.text,
  }))

  try {
    const data = await chatAI({
      persona: personaId.value,
      nickname: displayName.value,
      messages: history,
    })
    const reply = (data?.reply || '').trim()
    if (!reply) throw new Error('empty reply')
    thinking.value = false
    mood.emoji = currentPersona.value.mood.emoji
    mood.text = currentPersona.value.mood.text
    pushAiMessage(reply)
  } catch {
    thinking.value = false
    pushAiMessage(buildReply(content))
    ElMessage.warning('AI 服务暂时不可用，已切换为本地回复')
  }
}

function applyPersona(persona) {
  if (persona.id === personaId.value || thinking.value || streaming.value) return
  personaId.value = persona.id
  mood.emoji = persona.mood.emoji
  mood.text = persona.mood.text
  pushAiMessage(`${persona.greeting(displayName.value)}`, { instant: false })
  persist()
}

function appendEmoji(emoji) {
  input.value += emoji
}

function sendSuggestion(text) {
  send(text)
}

function copyMessage(text) {
  navigator.clipboard?.writeText(text).then(
    () => ElMessage.success('已复制'),
    () => ElMessage.error('复制失败')
  )
}

async function clearChat() {
  try {
    await ElMessageBox.confirm('清空后无法恢复，确定要清空聊天记录吗？', '清空聊天', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  clearInterval(streamTimer)
  streamTimer = null
  streaming.value = false
  thinking.value = false
  messages.value = []
  pushAiMessage(currentPersona.value.greeting(displayName.value), { instant: true })
  affection.value = Math.max(6, Math.round(affection.value / 2))
  persist()
  ElMessage.success('聊天已清空')
}

watch(nickname, persist)

onMounted(() => {
  const restored = restore()
  const persona = currentPersona.value
  mood.emoji = persona.mood.emoji
  mood.text = persona.mood.text
  if (!restored) {
    pushAiMessage(persona.greeting(displayName.value), { instant: true })
  }
  scrollToBottom()
})

onBeforeUnmount(() => {
  clearInterval(streamTimer)
  clearTimeout(saveTimer)
})
</script>

<template>
  <div class="ai-page">
    <div class="ai-shell">
      <!-- 左侧：AI 姬形象与设定 -->
      <aside class="character-panel">
        <div class="char-stage">
          <span class="deco d1">🍓</span>
          <span class="deco d2">♡</span>
          <span class="deco d3">✨</span>
          <span class="deco d4">🍓</span>
          <img :src="aiGirl" alt="草莓姬" class="char-img" />
          <div class="char-mood">
            <span class="mood-emoji">{{ mood.emoji }}</span>
            <span>{{ mood.text }}</span>
          </div>
        </div>

        <div class="char-info">
          <div class="char-name-row">
            <h2>草莓姬</h2>
            <span class="char-badge">AI 姬</span>
          </div>
          <p class="char-desc">{{ currentPersona.desc }}</p>
          <div class="char-tags">
            <span>二次元</span>
            <span>草莓控</span>
            <span>{{ currentPersona.name }}</span>
          </div>

          <div class="affection">
            <div class="affection-head">
              <span>好感度</span>
              <b>{{ affectionLevel }}</b>
            </div>
            <el-progress
              :percentage="affection"
              :stroke-width="9"
              :show-text="false"
              color="#ff7eb3"
            />
          </div>
        </div>

        <div class="panel-block">
          <div class="panel-label">人格设定</div>
          <div class="persona-list">
            <button
              v-for="p in personas"
              :key="p.id"
              class="persona-item"
              :class="{ active: personaId === p.id }"
              @click="applyPersona(p)"
            >
              <span class="persona-emoji">{{ p.emoji }}</span>
              <span class="persona-name">{{ p.name }}</span>
            </button>
          </div>
        </div>

        <div class="panel-block">
          <div class="panel-label">草莓姬怎么称呼你</div>
          <el-input
            v-model="nickname"
            maxlength="12"
            clearable
            placeholder="输入你的昵称"
          />
        </div>
      </aside>

      <!-- 右侧：聊天窗口 -->
      <section class="chat-window">
        <header class="chat-header">
          <div class="ai-profile">
            <div class="ai-avatar">
              <img :src="aiGirl" alt="草莓姬" />
            </div>
            <div class="ai-meta">
              <div class="ai-name">
                草莓姬
                <span class="ai-persona">{{ currentPersona.emoji }} {{ currentPersona.name }}</span>
              </div>
              <div class="ai-status">
                <span class="online-dot"></span>
                {{ thinking || streaming ? '正在输入…' : '在线 · 随时为你服务' }}
              </div>
            </div>
          </div>
          <el-tooltip content="清空聊天记录" placement="bottom">
            <el-button circle :icon="Delete" class="clear-btn" @click="clearChat" />
          </el-tooltip>
        </header>

        <div ref="listRef" class="chat-list">
          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="msg-row"
            :class="msg.role"
          >
            <div v-if="msg.role === 'ai'" class="msg-avatar ai">
              <img :src="aiGirl" alt="草莓姬" />
            </div>
            <div class="bubble-wrap">
              <div class="bubble" :class="msg.role">
                <span v-if="msg.role === 'ai' && !msg.text" class="dots">
                  <i></i><i></i><i></i>
                </span>
                <template v-else>{{ msg.text }}</template>
                <button
                  v-if="msg.role === 'ai' && msg.text && i === messages.length - 1 && !streaming"
                  class="copy-btn"
                  title="复制"
                  @click="copyMessage(msg.text)"
                >
                  <el-icon><CopyDocument /></el-icon>
                </button>
              </div>
              <div class="msg-time">{{ msg.time }}</div>
            </div>
            <div
              v-if="msg.role === 'user'"
              class="msg-avatar user"
              :style="{ background: avatarColor(displayName) }"
            >{{ avatarText(displayName) }}</div>
          </div>

          <div v-if="thinking" class="msg-row ai">
            <div class="msg-avatar ai">
              <img :src="aiGirl" alt="草莓姬" />
            </div>
            <div class="bubble ai typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div class="suggestions">
          <span class="sug-label">{{ thinking || streaming ? '草莓姬正在打字…' : '试试这样聊：' }}</span>
          <button
            v-for="s in suggestions"
            :key="s"
            class="sug-chip"
            :disabled="thinking || streaming"
            @click="sendSuggestion(s)"
          >{{ s }}</button>
        </div>

        <div class="chat-input">
          <div class="emoji-row">
            <span
              v-for="e in emojis"
              :key="e"
              class="emoji"
              @click="appendEmoji(e)"
            >{{ e }}</span>
          </div>
          <div class="input-row">
            <el-input
              v-model="input"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              resize="none"
              maxlength="300"
              placeholder="和草莓姬说点什么吧…（Enter 发送 / Shift + Enter 换行）"
              @keydown.enter.exact.prevent="send()"
            />
            <el-button
              class="send-btn"
              type="primary"
              :icon="Promotion"
              :disabled="!input.trim() || thinking || streaming"
              @click="send()"
            >发送</el-button>
          </div>
          <div class="input-tip">
            <el-icon><MagicStick /></el-icon>
            AI 姬生成内容仅供娱乐参考，请勿完全当真
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.ai-page {
  padding: 4px 0 8px;
}
.ai-shell {
  display: flex;
  max-width: 1120px;
  height: calc(100vh - 128px);
  min-height: 620px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(255, 126, 179, 0.16);
}

/* ============ 左侧角色面板 ============ */
.character-panel {
  width: 320px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #fff0f6 0%, #fff8fb 46%, #ffffff 100%);
  border-right: 1px solid #ffe3ee;
  padding: 16px;
  overflow-y: auto;
}
.char-stage {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  height: 218px;
  background: #ffd6e7;
  box-shadow: 0 8px 20px rgba(255, 126, 179, 0.24);
}
.char-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
  display: block;
}
.char-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 52%, rgba(255, 77, 148, 0.34) 100%);
  pointer-events: none;
}
.deco {
  position: absolute;
  z-index: 2;
  font-size: 18px;
  animation: floaty 4.6s ease-in-out infinite;
  filter: drop-shadow(0 2px 4px rgba(255, 90, 150, 0.28));
}
.deco.d1 { top: 10px; left: 12px; }
.deco.d2 { top: 18px; right: 16px; font-size: 22px; color: #fff; animation-delay: 0.7s; }
.deco.d3 { bottom: 46px; right: 12px; font-size: 15px; animation-delay: 1.4s; }
.deco.d4 { bottom: 18px; left: 14px; animation-delay: 2s; }
@keyframes floaty {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-7px) rotate(8deg); }
}
.char-mood {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #d6336c;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(214, 51, 108, 0.18);
}
.mood-emoji {
  font-size: 14px;
}
.char-info {
  padding: 14px 4px 0;
}
.char-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.char-name-row h2 {
  margin: 0;
  font-size: 22px;
  color: #c2255c;
  letter-spacing: 1px;
}
.char-badge {
  padding: 2px 9px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8fbd, #ff5f9e);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.char-desc {
  margin: 10px 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: #8a5a6d;
}
.char-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.char-tags span {
  padding: 3px 10px;
  border-radius: 10px;
  background: #ffe8f1;
  color: #e64980;
  font-size: 11px;
}
.affection {
  margin-top: 16px;
}
.affection-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #ad6a82;
  margin-bottom: 6px;
}
.affection-head b {
  color: #e64980;
}
.panel-block {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #ffd9e7;
}
.panel-label {
  font-size: 12px;
  font-weight: 700;
  color: #c2255c;
  margin-bottom: 10px;
}
.persona-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.persona-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 10px;
  border: 1px solid #ffd9e7;
  background: #fff;
  color: #8a5a6d;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.16s;
}
.persona-item:hover {
  border-color: #ff9ec7;
  color: #e64980;
  transform: translateY(-1px);
}
.persona-item.active {
  background: linear-gradient(135deg, #ff8fbd, #ff639f);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 5px 14px rgba(255, 95, 158, 0.32);
}
.persona-emoji {
  font-size: 14px;
}

/* ============ 右侧聊天区 ============ */
.chat-window {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 214, 231, 0.55), transparent 26%),
    radial-gradient(circle at 88% 14%, rgba(255, 236, 210, 0.6), transparent 24%),
    #fffbfd;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #ffe3ee;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(6px);
}
.ai-profile {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #ffb3d1;
  box-shadow: 0 3px 10px rgba(255, 126, 179, 0.3);
  flex-shrink: 0;
}
.ai-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 24%;
}
.ai-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #c2255c;
}
.ai-persona {
  padding: 1px 8px;
  border-radius: 9px;
  background: #ffe8f1;
  color: #e64980;
  font-size: 11px;
  font-weight: 600;
}
.ai-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 12px;
  color: #ad6a82;
}
.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #52c41a;
  box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.14);
}
.clear-btn {
  color: #ad6a82;
  border-color: #ffd9e7;
}
.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 20px 8px;
  scroll-behavior: smooth;
}
.chat-list::-webkit-scrollbar {
  width: 6px;
}
.chat-list::-webkit-scrollbar-thumb {
  background: #ffd0e2;
  border-radius: 3px;
}
.msg-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: flex-start;
}
.msg-row.user {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.msg-avatar.ai {
  border: 2px solid #ffc2da;
  box-shadow: 0 3px 8px rgba(255, 126, 179, 0.22);
}
.msg-avatar.ai img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 24%;
}
.msg-avatar.user {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}
.bubble-wrap {
  max-width: 74%;
  display: flex;
  flex-direction: column;
}
.msg-row.user .bubble-wrap {
  align-items: flex-end;
}
.bubble {
  position: relative;
  padding: 10px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;
  white-space: pre-wrap;
}
.bubble.ai {
  background: #fff;
  border: 1px solid #ffdcea;
  border-top-left-radius: 4px;
  color: #3d2b33;
  box-shadow: 0 3px 12px rgba(255, 158, 199, 0.12);
}
.bubble.user {
  background: linear-gradient(135deg, #ff8fbd, #ff5f9e);
  color: #fff;
  border-top-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(255, 95, 158, 0.26);
}
.msg-time {
  margin-top: 4px;
  font-size: 11px;
  color: #c9a3b3;
}
.copy-btn {
  border: none;
  background: transparent;
  color: #d9a4b8;
  cursor: pointer;
  padding: 0;
  margin-left: 6px;
  vertical-align: -2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.bubble.ai:hover .copy-btn {
  opacity: 1;
}
.dots {
  display: inline-flex;
  gap: 4px;
  padding: 5px 2px;
}
.dots i,
.bubble.typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffa8c8;
  animation: blink 1.2s infinite both;
}
.dots i:nth-child(2),
.bubble.typing span:nth-child(2) { animation-delay: 0.2s; }
.dots i:nth-child(3),
.bubble.typing span:nth-child(3) { animation-delay: 0.4s; }
.bubble.typing {
  display: inline-flex;
  gap: 4px;
  padding: 14px 16px;
}
@keyframes blink {
  0%, 80%, 100% { opacity: 0.28; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-2px); }
}
.suggestions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid #ffe9f2;
  background: rgba(255, 255, 255, 0.7);
}
.sug-label {
  font-size: 12px;
  color: #ad6a82;
}
.sug-chip {
  padding: 5px 12px;
  border-radius: 13px;
  border: 1px solid #ffc2da;
  background: #fff;
  color: #e64980;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.16s;
}
.sug-chip:hover:not(:disabled) {
  background: #ff5f9e;
  border-color: #ff5f9e;
  color: #fff;
  transform: translateY(-1px);
}
.sug-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chat-input {
  padding: 8px 20px 14px;
  border-top: 1px solid #ffe3ee;
  background: #fff;
}
.emoji-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}
.emoji {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s;
}
.emoji:hover {
  background: #ffe8f1;
}
.input-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.input-row :deep(.el-textarea__inner) {
  border-radius: 12px;
  background: #fff7fa;
  box-shadow: 0 0 0 1px #ffd9e7 inset;
  padding: 9px 14px;
  font-size: 14px;
}
.input-row :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #ff9ec7 inset;
}
.send-btn {
  flex-shrink: 0;
  border: none;
  background: linear-gradient(135deg, #ff8fbd, #ff5f9e);
  box-shadow: 0 5px 14px rgba(255, 95, 158, 0.3);
}
.send-btn:hover {
  background: linear-gradient(135deg, #ff7fb3, #ff4d94);
}
.input-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 11px;
  color: #c9a3b3;
}

@media (max-width: 900px) {
  .ai-shell {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 128px);
  }
  .character-panel {
    width: 100%;
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 12px;
    padding: 12px 14px;
    border-right: none;
    border-bottom: 1px solid #ffe3ee;
  }
  .char-stage {
    height: 110px;
    border-radius: 12px;
  }
  .char-mood {
    display: none;
  }
  .char-info {
    padding: 0;
  }
  .char-name-row h2 {
    font-size: 18px;
  }
  .char-desc {
    display: none;
  }
  .affection {
    margin-top: 10px;
  }
  .panel-block {
    grid-column: 1 / -1;
    margin-top: 8px;
    padding-top: 10px;
  }
  .persona-list {
    grid-template-columns: repeat(4, 1fr);
  }
  .chat-window {
    min-height: 520px;
  }
}
</style>
