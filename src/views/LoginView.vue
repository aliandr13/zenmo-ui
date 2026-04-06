<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/AuthLayout.vue'
import { BForm, BFormGroup, BFormInput, BButton, BAlert } from 'bootstrap-vue-next'

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
  <AuthLayout title="Please sign in">
    <BForm @submit.prevent="submit">
      <BFormGroup label="Email address" label-for="login-email" class="mb-3">
        <BFormInput
          id="login-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
        />
      </BFormGroup>
      <BFormGroup label="Password" label-for="login-password" class="mb-3">
        <BFormInput
          id="login-password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
        />
      </BFormGroup>
      <BAlert v-if="error" :model-value="true" variant="danger" class="mb-3">{{ error }}</BAlert>
      <BButton type="submit" variant="primary" class="w-100" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </BButton>
    </BForm>
    <template #footer>
      Don't have an account?
      <router-link to="/register" class="link-secondary">Register</router-link>
    </template>
  </AuthLayout>
</template>
