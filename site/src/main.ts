import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from '@/i18n'
import { syncDocumentLocale } from './i18n'
import '@fontsource-variable/golos-text'
import '@fontsource-variable/oswald'
import '@fontsource/pt-serif/400.css'
import '@fontsource/pt-serif/400-italic.css'
import '@fontsource/pt-serif/700.css'
import './site.css'

syncDocumentLocale()
createApp(App).use(i18n).mount('#app')
