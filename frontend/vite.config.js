import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],

  // 部署在根路径，使用绝对路径 base
  base: '/',

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  server: {
    proxy: {
      // 开发环境代理 /api 请求到后端
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
