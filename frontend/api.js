/**
 * 收藏功能 API 封装
 * 遵循 RESTful API 设计规范
 * 基础路径：/api/favorites
 */

import axios from 'axios'

// 创建 axios 实例（可复用项目已有实例）
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
  (error) => {
    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)

// ─────────────────────────────────────────────────────────────────
// API 方法
// ─────────────────────────────────────────────────────────────────

/**
 * 添加收藏
 * POST /api/favorites
 * @param {string} recipeId - 食谱 ID（UUID）
 * @returns {Promise<object>} 包含 favoriteId、createdAt
 */
export function addFavorite(recipeId) {
  return apiClient.post('/favorites', { recipeId })
}

/**
 * 取消收藏
 * DELETE /api/favorites/{recipeId}
 * @param {string} recipeId - 食谱 ID（UUID）
 * @returns {Promise<object>}
 */
export function removeFavorite(recipeId) {
  return apiClient.delete(`/favorites/${recipeId}`)
}

/**
 * 获取收藏列表（分页）
 * GET /api/favorites?page=1&pageSize=20
 * @param {object} params
 * @param {number} params.page - 页码（从 1 开始）
 * @param {number} params.pageSize - 每页条数（最大 100）
 * @returns {Promise<object>} { total, page, pageSize, list[] }
 */
export function getFavoriteList({ page = 1, pageSize = 20 } = {}) {
  return apiClient.get('/favorites', { params: { page, pageSize } })
}

/**
 * 查询单条收藏状态（用于食谱详情页初始化）
 * GET /api/favorites/{recipeId}/status
 * @param {string} recipeId - 食谱 ID（UUID）
 * @returns {Promise<object>} { isFavorited, favoriteId }
 */
export function getFavoriteStatus(recipeId) {
  return apiClient.get(`/favorites/${recipeId}/status`)
}

export default {
  addFavorite,
  removeFavorite,
  getFavoriteList,
  getFavoriteStatus
}
