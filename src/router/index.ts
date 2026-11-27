import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getAccessToken, setAuthFailureHandler } from '@/api/client'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without a session (login, register). */
    public?: boolean
    /** Needs a session; the guard restores it from the refresh cookie or redirects to login. */
    requiresAuth?: boolean
  }
}

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

router.beforeEach(async (to) => {
  if (to.meta.public || !to.meta.requiresAuth) return true

  const auth = useAuthStore()
  const toLogin = { name: 'Login', query: { redirect: to.fullPath } }
  try {
    // No access token in memory (first load / page reload): try the HttpOnly refresh cookie.
    if (!getAccessToken()) {
      return (await auth.restoreSession()) ? true : toLogin
    }
    if (!auth.user) await auth.fetchUser()
    return true
  } catch {
    return toLogin
  }
})

// A request failed because the session could not be refreshed: drop local state and go to login.
setAuthFailureHandler(() => {
  useAuthStore().sessionExpired()
  const current = router.currentRoute.value
  if (!current.meta.public) {
    router.push({ name: 'Login', query: { redirect: current.fullPath } })
  }
})

export default router
