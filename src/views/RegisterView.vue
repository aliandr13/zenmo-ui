<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/AuthLayout.vue'
import { BForm, BFormGroup, BFormInput, BButton, BAlert } from 'bootstrap-vue-next'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  loading.value = true
  try {
    await auth.register(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="Create an account">
    <BForm @submit.prevent="submit">
      <BFormGroup label="Email address" label-for="register-email" class="mb-3">
        <BFormInput
          id="register-email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
        />
      </BFormGroup>
      <BFormGroup label="Password (min 8)" label-for="register-password" class="mb-3">
        <BFormInput
          id="register-password"
          v-model="password"
          type="password"
          required
          autocomplete="new-password"
          minlength="8"
        />
      </BFormGroup>
      <BAlert v-if="error" variant="danger" class="mb-3" show>{{ error }}</BAlert>
      <BButton type="submit" variant="primary" class="w-100" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Create account' }}
      </BButton>
    </BForm>
    <template #footer>
      Already have an account?
      <router-link to="/login" class="link-secondary">Log in</router-link>
    </template>
  </AuthLayout>
</template>
