<script setup lang="ts">
import { BModalOrchestrator, BToastOrchestrator, BPopoverOrchestrator } from 'bootstrap-vue-next'
</script>

<template>
  <BModalOrchestrator />
  <BToastOrchestrator />
  <BPopoverOrchestrator />
  <router-view />
</template>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: var(--bs-body-font-family), system-ui, -apple-system, sans-serif;
}
#app {
  min-height: 100vh;
}
</style>
