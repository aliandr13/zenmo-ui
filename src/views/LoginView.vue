<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Login failed'
    if (msg === 'Load failed' || msg === 'Failed to fetch' || msg.includes('NetworkError')) {
      error.value = 'Cannot reach the API. Check that the Zenmo backend is running (e.g. mvn spring-boot:run) and reachable at the API URL. If the app runs on another port, set VITE_API_URL in .env.'
    } else {
      error.value = msg
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <h1>Log in</h1>
    <form @submit.prevent="submit" class="auth-form">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" required autocomplete="email" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" required autocomplete="current-password" />
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
    </form>
    <p class="foot">
      Don't have an account? <router-link to="/register">Register</router-link>
    </p>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 320px;
  margin: 2rem auto;
}
.auth-page h1 {
  margin-bottom: 1rem;
}
.auth-form .field {
  margin-bottom: 1rem;
}
.auth-form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
.auth-form input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.error {
  color: #c00;
  margin-bottom: 0.5rem;
}
.auth-form button {
  padding: 0.5rem 1rem;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}
.auth-form button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.foot {
  margin-top: 1rem;
  color: #666;
}
.foot a {
  color: #1a1a2e;
}
</style>
