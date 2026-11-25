import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/stores/auth'
import MainLayout from '@/layout/MainLayout.vue'
import Home from '@/views/Home.vue'
import GameGuide from '@/views/GameGuide.vue'
import MovieGuide from '@/views/MovieGuide.vue'
import AIChat from '@/views/AIChat.vue'
import Profile from '@/views/Profile.vue'
import Favorites from '@/views/Favorites.vue'
import Notifications from '@/views/Notifications.vue'
import HotRank from '@/views/HotRank.vue'
import UserProfile from '@/views/UserProfile.vue'
import Messages from '@/views/Messages.vue'
import Login from '@/views/Login.vue'

// 路由配置
const routes = [
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: Home },
      { path: 'game', name: 'game', component: GameGuide },
      { path: 'movie', name: 'movie', component: MovieGuide },
      { path: 'ai', name: 'ai', component: AIChat },
      { path: 'profile', name: 'profile', component: Profile },
      { path: 'favorites', name: 'favorites', component: Favorites },
      { path: 'notifications', name: 'notifications', component: Notifications },
      { path: 'hot', name: 'hot', component: HotRank },
      { path: 'user/:id', name: 'user', component: UserProfile },
      { path: 'messages', name: 'messages', component: Messages },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: Login,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局前置守卫：未登录访问业务页 -> 跳登录（携带来源地址，登录后跳回）
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const loggedIn = isLoggedIn()

  if (to.path === '/login') {
    return loggedIn ? next('/') : next()
  }
  if (requiresAuth && !loggedIn) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }
  next()
})

export default router
