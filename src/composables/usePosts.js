import { reactive, computed } from 'vue'

// 帖子分类（与首页 Tab 对应）
export const CATEGORIES = ['推荐', '游戏', '影视', 'AI']

// 发帖可选标签
export const PRESET_TAGS = ['游戏', '影视', '攻略', '求助', '吐槽', '推荐', '闲聊', 'AI']

const hour = 60 * 60 * 1000
const day = 24 * hour

const state = reactive({
  posts: [
    {
      id: 1,
      author: '攻略君',
      level: 6,
      title: '黑神话：悟空 全 Boss 打法心得整理（含隐藏boss）',
      content:
        '打了两周终于全 Boss 通关，整理了一份每个 Boss 的招式拆解和推荐变身/法术搭配。黄风大圣的风沙阶段一定要贴身输出，不然视野被挡很容易吃满伤害……',
      tags: ['游戏', '攻略'],
      category: '游戏',
      image: '黑神话 BOSS 战',
      likes: 2341,
      comments: 186,
      collects: 980,
      shares: 120,
      views: 15200,
      createdAt: Date.now() - 2 * hour,
    },
    {
      id: 2,
      author: '影视迷小莓',
      level: 4,
      title: '《沙丘 2》剧情伏笔全梳理，看懂这些细节才算没白看',
      content:
        '二刷之后发现好多第一遍没注意到的伏笔，比如保罗看到的未来幻象里多次出现的那个孩子，其实和契妮的结局直接相关。沙虫的骑行桥段真是年度最佳画面……',
      tags: ['影视', '推荐'],
      category: '影视',
      image: '沙丘 2',
      likes: 1580,
      comments: 92,
      collects: 430,
      shares: 76,
      views: 8900,
      createdAt: Date.now() - 5 * hour,
    },
    {
      id: 3,
      author: 'AI 炼丹师',
      level: 5,
      title: '用 AI 帮我写了一份游戏评测，效果居然还不错',
      content:
        '把游戏截图和基础设定丢给 AI，让它按不同风格生成评测文案，再人工润色。发现 AI 抓重点的能力比想象中强，但幽默感还是得靠人。分享一下我的提示词模板……',
      tags: ['AI', '闲聊'],
      category: 'AI',
      image: 'AI 写评测',
      likes: 760,
      comments: 54,
      collects: 210,
      shares: 33,
      views: 4200,
      createdAt: Date.now() - 8 * hour,
    },
    {
      id: 4,
      author: '褪色者',
      level: 7,
      title: '艾尔登法环 DLC 黄金树幽影 新手入门避坑指南',
      content:
        '梅瑟莫和拉塔恩这两个 Boss 劝退了不少人，其实只要把等级刷到 150+ 再进 DLC 体验会好很多。武器推荐用出血流，打拉塔恩时召唤 NPC 能极大降低难度……',
      tags: ['游戏', '攻略'],
      category: '游戏',
      image: '黄金树幽影',
      likes: 3120,
      comments: 240,
      collects: 1560,
      shares: 198,
      views: 22100,
      createdAt: Date.now() - 1 * day,
    },
    {
      id: 5,
      author: '熬夜追剧人',
      level: 3,
      title: '《繁花》人物关系图，一张图看懂爷叔和宝总的局',
      content:
        '王家卫的镜头语言太讲究了，很多线索都藏在细节里。整理了一张主要人物关系图，帮大家理清至真园、爷叔、宝总、李李之间的利益纠葛……',
      tags: ['影视'],
      category: '影视',
      image: '繁花',
      likes: 980,
      comments: 67,
      collects: 380,
      shares: 45,
      views: 6100,
      createdAt: Date.now() - 1 * day - 3 * hour,
    },
    {
      id: 6,
      author: '求带飞的萌新',
      level: 1,
      title: '新手求推荐一款耐玩的开放世界游戏，预算 200 以内',
      content:
        '刚通关塞尔达传说，沉浸感太强了，想再找一款类似的开放世界。目前在巫师 3、大表哥 2、原神之间纠结，有没有大佬推荐一下？最好剧情和探索都在线的……',
      tags: ['求助', '游戏'],
      category: '游戏',
      likes: 120,
      comments: 88,
      collects: 20,
      shares: 5,
      views: 1800,
      createdAt: Date.now() - 1 * day - 6 * hour,
    },
    {
      id: 7,
      author: '原学家',
      level: 8,
      title: '原神 5.3 版本角色培养优先级一览，别再乱刷圣遗物了',
      content:
        '新版本角色强度榜更新，哪些角色值得拉满、哪些仓管就别浪费资源了。附最新的圣遗物主副词条推荐和配队思路，平民党照抄就行……',
      tags: ['游戏', '攻略', '推荐'],
      category: '游戏',
      image: '原神 5.3',
      likes: 4200,
      comments: 310,
      collects: 2800,
      shares: 260,
      views: 31000,
      createdAt: Date.now() - 2 * day,
    },
    {
      id: 8,
      author: '影评人阿莓',
      level: 6,
      title: '诺兰《奥本海默》时间线整理，三线叙事终于理顺了',
      content:
        '彩色、黑白两条时间线来回切，第一遍看确实容易晕。整理了从曼哈顿计划到听证会的完整时间线，附上每个关键人物的原型介绍，收藏慢慢看……',
      tags: ['影视', '攻略'],
      category: '影视',
      likes: 1340,
      comments: 76,
      collects: 520,
      shares: 60,
      views: 7600,
      createdAt: Date.now() - 2 * day - 2 * hour,
    },
    {
      id: 9,
      author: '摸鱼大师',
      level: 2,
      title: '有没有人和我一样，玩游戏前必看攻略，看了又嫌剧透？',
      content:
        '纠结症本人：不看攻略怕错过隐藏内容，看了又少了探索的乐趣。大家玩开放世界一般是先通关再看攻略，还是边玩边查？评论区聊聊……',
      tags: ['闲聊', '吐槽'],
      category: '推荐',
      likes: 540,
      comments: 210,
      collects: 15,
      shares: 8,
      views: 3300,
      createdAt: Date.now() - 3 * day,
    },
    {
      id: 10,
      author: 'AI 姬饲养员',
      level: 5,
      title: '让 AI 帮我整理了 2024 年度必看电影清单，附豆瓣评分',
      content:
        '把全年上映的电影数据喂给 AI，让它按类型、评分、口碑排序，生成了一份年度清单。科幻、悬疑、动画各挑了几部代表作，过年片荒可以收藏……',
      tags: ['AI', '影视', '推荐'],
      category: 'AI',
      image: '年度电影清单',
      likes: 1820,
      comments: 95,
      collects: 1100,
      shares: 140,
      views: 12500,
      createdAt: Date.now() - 3 * day - 4 * hour,
    },
    {
      id: 11,
      author: '手残玩家',
      level: 2,
      title: '只狼打了三天还卡在第一个 Boss，是不是该退款了……',
      content:
        '被弦一郎虐到怀疑人生，格挡时机老是掌握不好。有没有同样手残的通关大佬指点一下？还是说我真的不适合魂系游戏……',
      tags: ['吐槽', '求助', '游戏'],
      category: '游戏',
      likes: 320,
      comments: 156,
      collects: 10,
      shares: 3,
      views: 2400,
      createdAt: Date.now() - 4 * day,
    },
    {
      id: 12,
      author: '二次元莓友',
      level: 4,
      title: '本季度追番清单分享，这几部神作别错过',
      content:
        '整理了本季度个人最推荐的几部番剧，涵盖战斗、治愈、悬疑各类型。附每部的看点和避雷提示，周末补番可以按这个来……',
      tags: ['推荐', '影视'],
      category: '影视',
      image: '本季度番剧',
      likes: 760,
      comments: 48,
      collects: 290,
      shares: 35,
      views: 4800,
      createdAt: Date.now() - 5 * day,
    },
  ],
  hotTopics: [
    { rank: 1, title: '27秋招太难了，聊聊大家都拿到了哪些游戏厂 offer', heat: '3291' },
    { rank: 2, title: '哪个厂实习算法岗不考 leetcode', heat: '2777' },
    { rank: 3, title: '字节开了 25K*15！游戏策划岗一面经验', heat: '2661' },
    { rank: 4, title: '原神 5.3 版本角色培养全攻略', heat: '2386' },
    { rank: 5, title: '28届游戏开发实习总结', heat: '2281' },
    { rank: 6, title: '《沙丘 2》伏笔全梳理，看懂细节才算没白看', heat: '1880' },
    { rank: 7, title: '百度推荐算法日常实习面经', heat: '1726' },
    { rank: 8, title: '用 AI 写游戏评测，提示词模板分享', heat: '1659' },
    { rank: 9, title: '只狼手残党通关记录：我是怎么打过弦一郎的', heat: '1480' },
    { rank: 10, title: '2024 年度必看电影清单整理', heat: '1320' },
  ],
})

let nextId = 1000

export function usePosts() {
  const posts = computed(() => state.posts)
  const hotTopics = computed(() => state.hotTopics)

  // 按分类过滤帖子
  const postsByCategory = (category) =>
    computed(() =>
      category && category !== '推荐'
        ? state.posts.filter((p) => p.category === category)
        : state.posts
    )

  // 发布带标签的新帖
  function publishPost({ author = '莓友', content = '', tags = [], images = [], category = '推荐' }) {
    const post = {
      id: nextId++,
      author,
      level: 1,
      title: '',
      content,
      tags,
      category,
      images,
      image: images[0] || '',
      likes: 0,
      comments: 0,
      collects: 0,
      shares: 0,
      views: 1,
      createdAt: Date.now(),
    }
    state.posts.unshift(post)
    return post
  }

  function toggleLike(id) {
    const post = state.posts.find((p) => p.id === id)
    if (post) {
      post.liked = !post.liked
      post.likes += post.liked ? 1 : -1
    }
  }

  function toggleCollect(id) {
    const post = state.posts.find((p) => p.id === id)
    if (post) {
      post.collected = !post.collected
      post.collects += post.collected ? 1 : -1
    }
  }

  return {
    posts,
    hotTopics,
    postsByCategory,
    publishPost,
    toggleLike,
    toggleCollect,
  }
}
