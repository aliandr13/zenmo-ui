import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'accounts', name: 'Accounts', component: () => import('@/views/AccountsView.vue') },
        { path: 'transactions', name: 'Transactions', component: () => import('@/views/TransactionsView.vue') },
        { path: 'categories', name: 'Categories', component: () => import('@/views/CategoriesView.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    next()
    return
  }
  if (to.meta.requiresAuth) {
    const token = (await import('@/api/client')).getAccessToken()
    if (!token) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    if (!auth.user) {
      try {
        await auth.fetchUser()
      } catch {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
  }
  next()
})

export default router
