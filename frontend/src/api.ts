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
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：自动附加 Token
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  response => response.data,
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
  description?: string
  category?: string
  difficulty?: string
  servings?: number
}

export interface RecipeDetail extends Recipe {
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  steps?: Array<{ stepNumber: number; content: string; image?: string }>
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

// ─────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────

/**
 * 用户注册
 * POST /api/auth/register
 */
export function register(data: {
  username: string
  password: string
  email?: string
  nickname?: string
}) {
  return apiClient.post('/auth/register', data)
}

/**
 * 用户登录
 * POST /api/auth/login
 */
export function login(data: { username: string; password: string }) {
  return apiClient.post('/auth/login', data)
}

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
export function getMe() {
  return apiClient.get('/auth/me')
}

// ─────────────────────────────────────────────────────────────────
// Recipes API
// ─────────────────────────────────────────────────────────────────

/**
 * 获取食谱列表（分页、分类）
 * GET /api/recipes?page=1&pageSize=20&category=中餐
 */
export function getRecipes(params: { page?: number; pageSize?: number; category?: string }) {
  return apiClient.get('/recipes', { params: { page: 1, pageSize: 20, ...params } })
}

/**
 * 获取食谱详情
 * GET /api/recipes/:id
 */
export function getRecipeById(id: string) {
  return apiClient.get(`/recipes/${id}`)
}

/**
 * 搜索食谱
 * GET /api/recipes/search?q=关键词&page=1&pageSize=20
 */
export function searchRecipes(params: { q: string; page?: number; pageSize?: number }) {
  return apiClient.get('/recipes/search', { params: { page: 1, pageSize: 20, ...params } })
}

// ─────────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  username: string
  nickname?: string
  createdAt: string
}

/**
 * 获取用户信息
 * GET /api/users/:id/profile
 */
export function getUserProfile(id: string): Promise<UserProfile> {
  return apiClient.get(`/users/${id}/profile`)
}

/**
 * 获取用户发布的食谱
 * GET /api/users/:id/recipes?page=1&pageSize=20
 */
export function getUserRecipes(params: { userId: string; page?: number; pageSize?: number }) {
  return apiClient.get(`/users/${params.userId}/recipes`, {
    params: { page: params.page || 1, pageSize: params.pageSize || 20 },
  })
}

// ─────────────────────────────────────────────────────────────────
// Recipe CRUD API
// ─────────────────────────────────────────────────────────────────

export interface CreateRecipeData {
  title: string
  description?: string
  category?: string
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  steps?: Array<{ stepNumber: number; content: string; image?: string }>
  coverImage?: string
  servings?: number
  difficulty?: string
  cookTime?: number
}

/**
 * 创建食谱
 * POST /api/recipes
 */
export function createRecipe(data: CreateRecipeData) {
  return apiClient.post('/recipes', data)
}

/**
 * 更新食谱
 * PUT /api/recipes/:id
 */
export function updateRecipe(id: string, data: Partial<CreateRecipeData>) {
  return apiClient.put(`/recipes/${id}`, data)
}

/**
 * 删除食谱
 * DELETE /api/recipes/:id
 */
export function deleteRecipe(id: string) {
  return apiClient.delete(`/recipes/${id}`)
}

// ─────────────────────────────────────────────────────────────────
// Recommend API
// ─────────────────────────────────────────────────────────────────

export interface RecommendRecipe {
  id: string
  title: string
  coverImage?: string
  author?: string
  cookTime?: number
  description?: string
  category?: string
  difficulty?: string
  servings?: number
  matchScore: number
  matchedIngredients: string[]
  totalIngredients: number
}

export interface RecommendResponse {
  input: string[]
  list: RecommendRecipe[]
  aiGenerated: boolean
  aiRecipes: Array<{
    title: string
    description: string
    ingredients: Array<{ name: string; amount: number; unit: string }>
    cookTime: number
    difficulty: string
    servings: number
  }>
}

/**
 * 食材推荐菜谱
 * GET /api/recipes/recommend?ingredients=鸡蛋,番茄
 */
export function recommendRecipes(ingredients: string): Promise<RecommendResponse> {
  return apiClient.get('/recipes/recommend', { params: { ingredients } })
}

export default {
  addFavorite,
  removeFavorite,
  getFavoriteList,
  getFavoriteStatus,
  register,
  login,
  getMe,
  getRecipes,
  getRecipeById,
  searchRecipes,
  recommendRecipes,
  getUserProfile,
  getUserRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
}
