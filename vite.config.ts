/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // relative asset paths: the desktop shell serves the build from its own scheme
  base: './',
  plugins: [
    vue(),
    tailwindcss(),
    // the web build installs as an app and works offline; main.ts never registers the worker
    // in the desktop shell, which serves files itself
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Своя игра',
        short_name: 'Своя игра',
        description: 'Конструктор и проигрыватель «Своей игры»: табло, вопросы с картинками, музыкой и YouTube, пульт ведущего.',
        lang: 'ru',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0a4a',
        theme_color: '#14117a',
        categories: ['games', 'entertainment', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mp3}'],
        // the sample packs are a few hundred KB each and only one language is ever opened
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.gamezip'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'samples', expiration: { maxEntries: 6 } },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // only the Composition API and t() are used, no legacy API, <i18n-t> or v-t: lets the
  // bundler drop that part of vue-i18n
  define: {
    __VUE_I18N_LEGACY_API__: 'false',
    __VUE_I18N_FULL_INSTALL__: 'false',
    __INTLIFY_PROD_DEVTOOLS__: 'false',
  },
  clearScreen: false,
  server: { host: true, port: 5173, strictPort: true },
  test: {
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto', './src/i18n/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
