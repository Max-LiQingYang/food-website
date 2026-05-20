/**
 * 收藏功能 API 封装（TypeScript 版）
 * 遵循 RESTful API 设计规范
 * 基础路径：/api/favorites
 */

import axios, { AxiosError } from 'axios'

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：自动附加 Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ message?: string }>) => {
    let message: string

    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        message = '请求超时，请检查网络后重试'
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        message = '网络连接失败，请检查网络设置'
      } else {
        message = '网络异常，请稍后重试'
      }
    } else {
      message = error.response?.data?.message || `请求失败 (${error.response.status})`
    }

    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)

// ─────────────────────────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────────────────────────

export interface AddFavoriteResponse {
  favoriteId: string
  createdAt: string
}

export interface FavoriteItem {
  id: number
  userId: string
  recipeId: string
  createdAt: string
  recipe?: Recipe | null
}

export interface Recipe {
  id: string
  title: string
  coverImage?: string
  author?: string
  cookTime?: number
}

export interface FavoriteListResponse {
  data: {
    list: FavoriteItem[]
    total: number
    page: number
    pageSize: number
  }
}

export interface FavoriteStatusResponse {
  isFavorited: boolean
  favoriteId: string
}

// ─────────────────────────────────────────────────────────────────
// API 方法
// ─────────────────────────────────────────────────────────────────

/**
 * 添加收藏
 * POST /api/favorites
 */
export function addFavorite(recipeId: string): Promise<AddFavoriteResponse> {
  return apiClient.post('/favorites', { recipeId })
}

/**
 * 取消收藏
 * DELETE /api/favorites/{recipeId}
 */
export function removeFavorite(recipeId: string): Promise<void> {
  return apiClient.delete(`/favorites/${recipeId}`)
}

/**
 * 获取收藏列表（分页）
 * GET /api/favorites?page=1&pageSize=20
 */
export function getFavoriteList(params: {
  page?: number
  pageSize?: number
}): Promise<FavoriteListResponse> {
  return apiClient.get('/favorites', { params: { page: 1, pageSize: 20, ...params } })
}

/**
 * 查询单条收藏状态
 * GET /api/favorites/{recipeId}/status
 */
export function getFavoriteStatus(recipeId: string): Promise<FavoriteStatusResponse> {
  return apiClient.get(`/favorites/${recipeId}/status`)
}

export default {
  addFavorite,
  removeFavorite,
  getFavoriteList,
  getFavoriteStatus
}
