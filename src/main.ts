import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initPlatform } from './platform'
import './styles.css'

await initPlatform()
createApp(App).use(createPinia()).use(router).mount('#app')
