<script setup lang="ts">
import { useRouter } from 'vue-router'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import {
  BNavbar,
  BNavbarBrand,
  BNavbarToggle,
  BNavbarNav,
  BCollapse,
  BDropdown,
  BDropdownItem,
  BButton,
} from 'bootstrap-vue-next'

const router = useRouter()
const auth = useAuthStore()
const themeStore = useThemeStore()

function logout() {
  auth.logout()
  router.push({ name: 'Login' })
}

function setTheme(mode: 'light' | 'dark' | 'system') {
  themeStore.setMode(mode)
}
</script>

<template>
  <div class="layout">
    <BNavbar variant="dark" toggleable="lg" class="navbar-dark">
      <BNavbarBrand :to="{ name: 'Dashboard' }">Zenmo</BNavbarBrand>
      <BNavbarToggle target="nav-collapse" />
      <BCollapse id="nav-collapse" is-nav>
        <BNavbarNav>
          <li class="nav-item">
            <RouterLink to="/" class="nav-link" active-class="active">Dashboard</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/accounts" class="nav-link" active-class="active">Accounts</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/transactions" class="nav-link" active-class="active">Transactions</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink to="/categories" class="nav-link" active-class="active">Categories</RouterLink>
          </li>
        </BNavbarNav>
        <BNavbarNav class="ms-auto mb-2 mb-lg-0">
          <BDropdown
            :text="themeStore.mode === 'system' ? 'Theme (System)' : `Theme (${themeStore.mode})`"
            variant="outline-light"
            size="sm"
            class="me-2"
          >
            <BDropdownItem :active="themeStore.mode === 'light'" @click="setTheme('light')">
              Light
            </BDropdownItem>
            <BDropdownItem :active="themeStore.mode === 'dark'" @click="setTheme('dark')">
              Dark
            </BDropdownItem>
            <BDropdownItem :active="themeStore.mode === 'system'" @click="setTheme('system')">
              System
            </BDropdownItem>
          </BDropdown>
          <BButton variant="outline-light" size="sm" @click="logout">Logout</BButton>
        </BNavbarNav>
      </BCollapse>
    </BNavbar>
    <main class="main container py-4">
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
.navbar-dark {
  background-color: var(--bs-dark);
}
.main {
  flex: 1;
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}
</style>
