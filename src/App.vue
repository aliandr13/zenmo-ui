<script setup lang="ts">
import { BApp } from 'bootstrap-vue-next'
</script>

<template>
  <BApp>
    <router-view />
  </BApp>
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
