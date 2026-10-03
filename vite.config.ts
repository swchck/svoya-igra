/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // relative asset paths: the desktop shell serves the build from its own scheme
  base: './',
  plugins: [vue()],
  clearScreen: false,
  server: { host: true, port: 5173, strictPort: true },
  test: {
    environment: 'happy-dom',
    setupFiles: ['fake-indexeddb/auto'],
    include: ['src/**/*.test.ts'],
  },
})
