import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initPlatform } from './platform'
import '@fontsource/pt-serif/400.css'
import '@fontsource/pt-serif/400-italic.css'
import '@fontsource/pt-serif/700.css'
import '@fontsource/pt-serif/700-italic.css'
import './styles.css'

await initPlatform()
createApp(App).use(createPinia()).use(router).mount('#app')
