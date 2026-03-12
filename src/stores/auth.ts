import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { setTokens, clearTokens as clearApiTokens } from '@/api/client'
import type { CurrentUser } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function login(email: string, password: string) {
    const tokens = await authApi.login({ email, password })
    setTokens(tokens.accessToken, tokens.refreshToken)
    await fetchUser()
  }

  async function register(email: string, password: string) {
    const tokens = await authApi.register({ email, password })
    setTokens(tokens.accessToken, tokens.refreshToken)
    await fetchUser()
  }

  async function fetchUser() {
    user.value = await authApi.me()
  }

  function logout() {
    user.value = null
    clearApiTokens()
  }

  return {
    user,
    isAuthenticated,
    login,
    register,
    fetchUser,
    logout,
  }
})
