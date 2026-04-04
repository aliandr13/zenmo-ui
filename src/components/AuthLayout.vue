<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div
    class="min-vh-100 d-flex align-items-center justify-content-center py-5 bg-body-secondary"
  >
    <div class="w-100 px-3 auth-inner">
      <h1 class="h3 mb-3 fw-normal text-center">{{ title }}</h1>
      <slot />
      <div v-if="$slots.footer" class="text-center text-muted small mt-3">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-inner {
  max-width: 330px;
  margin-left: auto;
  margin-right: auto;
}
</style>
