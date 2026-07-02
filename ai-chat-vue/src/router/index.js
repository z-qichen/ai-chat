import { createRouter, createWebHistory } from 'vue-router';
const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'chat',
            component: () => import('@/pages/ChatPage.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/settings',
            name: 'settings',
            component: () => import('@/pages/SettingsPage.vue'),
            meta: { requiresAuth: true },
        },
        {
            path: '/memory',
            name: 'memory',
            component: () => import('@/pages/MemoryPage.vue'),
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
});
router.beforeEach((to, _from) => {
    const token = localStorage.getItem('ai-chat-token');
    if (to.meta.requiresAuth && !token) {
        return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (to.name === 'login' && token) {
        return { name: 'chat' };
    }
});
export default router;
