import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createBootstrap } from 'bootstrap-vue-next/plugins/createBootstrap'
import { applyInitialTheme } from '@/stores/theme'
import App from './App.vue'
import router from './router'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

applyInitialTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(createBootstrap())
app.mount('#app')
