import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// PORTABLE=1 npm run build → один автономный index.html со всем встроенным.
declare const process: { env: Record<string, string | undefined> }
const portable = process.env.PORTABLE === '1'

export default defineConfig({
  base: portable ? './' : '/',
  plugins: [vue(), ...(portable ? [viteSingleFile()] : [])],
  server: { host: true, port: 5173 },
  build: portable
    ? {
        // Вшиваем все ассеты как base64. Потолок специально огромный — пусть будет один файл.
        assetsInlineLimit: 100 * 1024 * 1024,
        cssCodeSplit: false,
        chunkSizeWarningLimit: 50_000,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
        outDir: 'dist-portable',
        emptyOutDir: true,
      }
    : undefined,
})
