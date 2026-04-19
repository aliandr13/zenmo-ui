import { ref, onMounted, onUnmounted } from 'vue'

/** Matches viewports below Bootstrap `sm` (phones, narrow windows). */
const DEFAULT_QUERY = '(max-width: 575.98px)'

export function useNarrowViewport(mediaQuery = DEFAULT_QUERY) {
  const matches = ref(
    typeof window !== 'undefined' && window.matchMedia(mediaQuery).matches,
  )

  let mql: MediaQueryList | undefined
  function onChange() {
    if (mql) matches.value = mql.matches
  }

  onMounted(() => {
    mql = window.matchMedia(mediaQuery)
    matches.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onUnmounted(() => {
    mql?.removeEventListener('change', onChange)
  })

  return matches
}
