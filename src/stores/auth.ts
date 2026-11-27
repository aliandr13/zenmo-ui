import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { setAccessToken, clearTokens, refreshAccessToken, logoutSession, AuthExpiredError } from '@/api/client'
import type { CurrentUser } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<CurrentUser | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  async function login(email: string, password: string) {
    // The refresh token arrives as an HttpOnly cookie; the body copy (for native clients) is ignored.
    const tokens = await authApi.login({ email, password })
    setAccessToken(tokens.accessToken)
    await fetchUser()
  }

  async function register(email: string, password: string) {
    const tokens = await authApi.register({ email, password })
    setAccessToken(tokens.accessToken)
    await fetchUser()
  }

  async function fetchUser() {
    user.value = await authApi.me()
  }

  /**
   * Restores the session after a page reload using the refresh cookie.
   * Returns false when there is no valid session (user must log in). Network errors are rethrown.
   */
  async function restoreSession(): Promise<boolean> {
    try {
      await refreshAccessToken()
    } catch (e) {
      if (e instanceof AuthExpiredError) return false
      throw e
    }
    await fetchUser()
    return true
  }

  /** Clears local state after the server reported the session as expired. */
  function sessionExpired() {
    user.value = null
    clearTokens()
  }

  async function logout() {
    user.value = null
    await logoutSession()
  }

  return {
    user,
    isAuthenticated,
    login,
    register,
    fetchUser,
    restoreSession,
    sessionExpired,
    logout,
  }
})
