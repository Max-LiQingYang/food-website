import { createRouter, createWebHistory } from 'vue-router'
import { defineAsyncComponent } from 'vue'
import HomePage from '../../pages/HomePage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: defineAsyncComponent(() => import('../../pages/FavoriteList.vue'))
    }
  ]
})

export default router
