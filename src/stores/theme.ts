import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const STORAGE_KEY = 'zenmo-theme'
type ThemeMode = 'light' | 'dark' | 'system'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-bs-theme', theme)
}

/** Call before app mount to avoid flash of wrong theme */
export function applyInitialTheme(): void {
  if (typeof window === 'undefined') return
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  const mode = saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system'
  const resolved = resolveTheme(mode)
  applyTheme(resolved)
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((() => {
    if (typeof window === 'undefined') return 'system'
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return saved === 'dark' || saved === 'light' || saved === 'system' ? saved : 'system'
  })())

  const systemTheme = ref<'light' | 'dark'>(getSystemTheme())

  const resolvedTheme = computed<'light' | 'dark'>(() =>
    mode.value === 'system' ? systemTheme.value : mode.value
  )

  function setMode(value: ThemeMode) {
    mode.value = value
    localStorage.setItem(STORAGE_KEY, value)
    applyTheme(resolvedTheme.value)
  }

  watch(resolvedTheme, (theme) => {
    applyTheme(theme)
  }, { immediate: true })

  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      systemTheme.value = getSystemTheme()
    })
  }

  return { mode, resolvedTheme, setMode }
})
