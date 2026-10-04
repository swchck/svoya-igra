import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { initPlatform, overlayTitleBar } from './platform'
import { currentLocale, i18n, loadLocale, syncLocaleAcrossWindows } from './i18n'
import { registerServiceWorker } from './pwa'
import '@fontsource-variable/golos-text'
import '@fontsource-variable/oswald'
import '@fontsource/pt-serif/400.css'
import '@fontsource/pt-serif/400-italic.css'
import '@fontsource/pt-serif/700.css'
import './styles.css'

// installing the router starts the first navigation, so the page's chunk downloads alongside the messages
const app = createApp(App).use(createPinia()).use(router).use(i18n)
await Promise.all([initPlatform(), loadLocale(currentLocale())])
if (overlayTitleBar) document.documentElement.classList.add('overlay-titlebar')
syncLocaleAcrossWindows()
app.mount('#app')
void registerServiceWorker()
