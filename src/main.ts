import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initPlatform, overlayTitleBar } from './platform'
import { i18n, syncLocaleAcrossWindows } from './i18n'
import { registerServiceWorker } from './pwa'
import '@fontsource-variable/golos-text'
import '@fontsource-variable/oswald'
import '@fontsource/pt-serif/400.css'
import '@fontsource/pt-serif/400-italic.css'
import '@fontsource/pt-serif/700.css'
import './styles.css'

await initPlatform()
if (overlayTitleBar) document.documentElement.classList.add('overlay-titlebar')
syncLocaleAcrossWindows()
createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
void registerServiceWorker()
