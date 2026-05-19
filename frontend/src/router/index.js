import { createRouter, createWebHistory } from 'vue-router'
import { defineAsyncComponent } from 'vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: {
        template: `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;gap:16px;">
            <h1 style="font-size:28px;color:#1a1a1a;">🍳 美食食谱首页</h1>
            <p style="color:#999;font-size:16px;">首页建设中，敬请期待~</p>
            <a href="/#/favorites" style="margin-top:8px;color:#ff4d4f;font-size:15px;text-decoration:none;">→ 我的收藏</a>
          </div>
        `
      }
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: defineAsyncComponent(() => import('../pages/FavoriteList.vue'))
    }
  ]
})

export default router
