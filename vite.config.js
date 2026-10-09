import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
  },

  build: {
    outDir: 'dist',
    // 把体积较大且很少变动的第三方库单独拆包，避免每次改文章都让用户重新下载
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          markdown: ['markdown-it', 'highlight.js'],
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
})
