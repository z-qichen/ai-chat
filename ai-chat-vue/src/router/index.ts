import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/ChatPage.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'chat-new',
          component: () => import('@/components/ChatArea.vue'),
        },
        {
          path: 'chat/:id',
          name: 'chat-session',
          component: () => import('@/components/ChatArea.vue'),
        },
        {
          path: 'task',
          name: 'task',
          component: () => import('@/pages/TaskPage.vue'),
        },
        {
          path: 'agents',
          name: 'agents',
          component: () => import('@/pages/AgentPage.vue'),
        },
        {
          path: 'plugins',
          name: 'plugins',
          component: () => import('@/pages/PluginsPage.vue'),
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@/pages/HistoryPage.vue'),
        },
        {
          path: 'memory',
          name: 'memory',
          component: () => import('@/pages/MemoryPage.vue'),
        },
      ],
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/SettingsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
    },
  ],
})

router.beforeEach((to, _from) => {
  const token = localStorage.getItem('ai-chat-token')

  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && token) {
    return { name: 'chat-new' }
  }
})

export default router
