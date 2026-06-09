import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方库分离
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['axios'],
          'vendor-charts': ['recharts'],
          // 首页内部组件按需懒加载（仅生产构建时）
          'home-hero': [
            './src/components/HeroSection.tsx',
            './src/components/DailyPickCard.tsx',
          ],
          'home-cards': [
            './src/components/RecipeCard.tsx',
            './src/components/RecipeCardSkeleton.tsx',
          ],
          'dashboard': [
            './src/components/dashboard/OverviewCards.tsx',
            './src/components/dashboard/CookingTrendChart.tsx',
            './src/components/dashboard/NutritionRadarChart.tsx',
            './src/components/dashboard/DistributionChart.tsx',
            './src/components/dashboard/Suggestions.tsx',
            './src/components/dashboard/QuickActions.tsx',
            './src/components/dashboard/AchievementOverview.tsx',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
