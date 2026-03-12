<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="layout">
    <nav class="nav">
      <router-link to="/" class="brand">Zenmo</router-link>
      <router-link to="/">Dashboard</router-link>
      <router-link to="/accounts">Accounts</router-link>
      <router-link to="/transactions">Transactions</router-link>
      <router-link to="/categories">Categories</router-link>
      <button type="button" class="logout" @click="logout">Logout</button>
    </nav>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #1a1a2e;
  color: #eee;
}
.nav a {
  color: #eee;
  text-decoration: none;
}
.nav a.router-link-active {
  font-weight: 600;
  color: #fff;
}
.brand {
  font-weight: 700;
  margin-right: 0.5rem;
}
.logout {
  margin-left: auto;
  padding: 0.35rem 0.75rem;
  background: #333;
  border: 1px solid #555;
  color: #eee;
  border-radius: 4px;
  cursor: pointer;
}
.logout:hover {
  background: #444;
}
.main {
  flex: 1;
  padding: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}
</style>
