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
  viewCount?: number
  avgRating?: number
  ratingCount?: number
  season?: string
  qualityScore?: number
  qualityLabel?: string
  favoriteCount?: number
  commentCount?: number
  nutriScore?: string
  smartDifficulty?: string
  story?: string
  culturalBackground?: string
  nutrition?: {
    calories?: number
    protein?: number
    fat?: number
    carbs?: number
    fiber?: number
    sodium?: number
  }
  tips?: string
}

export interface RecipeDetail extends Recipe {
  ingredients?: Array<{ name: string; amount: number; unit: string }>
  steps?: Array<{ stepNumber: number; content: string; image?: string }>
}

export interface SimilarRecipe {
  recipe: Recipe
  similarity: number
}

export interface SeasonalRecipes {
  list: Recipe[]
  season: string
  seasonLabel?: string
  total: number
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
 * 获取编辑精选食谱
 * GET /api/recipes/featured
 */
export function getFeaturedRecipes() {
  return apiClient.get('/recipes/featured')
}

/**
 * 搜索食谱
 * GET /api/recipes/search?q=关键词&page=1&pageSize=20
 */
export function searchRecipes(params: { q: string; page?: number; pageSize?: number }) {
  return apiClient.get('/recipes/search', { params: { page: 1, pageSize: 20, ...params } })
}

/**
 * 搜索建议（轻量级，返回标题+ID）
 * GET /api/recipes/suggestions?q=xxx
 */
export function getSuggestions(q: string) {
  return apiClient.get('/recipes/suggestions', { params: { q } })
}

/**
 * 获取季节性推荐食谱
 * GET /api/recipes/seasonal?season=spring
 */
export function getSeasonalRecipes(season?: string) {
  const params: any = {}
  if (season) params.season = season
  return apiClient.get('/recipes/seasonal', { params })
}

/**
 * 获取相似食谱推荐（含 Jaccard 相似度）
 * GET /api/recipes/:id/similar
 */
export function getSimilarRecipes(recipeId: string): Promise<{ data: { list: Array<{ recipe: Recipe; similarity: number }>; recipeId: string } }> {
  return apiClient.get(`/recipes/${recipeId}/similar`)
}

// ─────────────────────────────────────────────────────────────────
// Users API
// ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  username: string
  nickname?: string
  avatar?: string
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

/**
 * 获取用户烹饪统计
 * GET /api/users/:id/stats
 */
export interface UserStats {
  userId: string
  recipeCount: number
  favoriteCount: number
  commentCount: number
  followersCount: number
  followingCount: number
}

export function getUserStats(id: string): Promise<UserStats> {
  return apiClient.get(`/users/${id}/stats`)
}

/**
 * 获取用户收藏的食谱
 * GET /api/users/:id/favorites?page=1&pageSize=20
 */
export function getUserFavorites(params: { userId: string; page?: number; pageSize?: number }) {
  return apiClient.get(`/users/${params.userId}/favorites`, {
    params: { page: params.page || 1, pageSize: params.pageSize || 20 },
  })
}

/**
 * 获取用户活跃热力图数据
 * GET /api/users/:id/activity-heatmap?days=30
 */
export interface ActivityHeatmapDay {
  date: string
  recipeCount: number
  favoriteCount: number
  commentCount: number
  total: number
}

export interface ActivityHeatmapResponse {
  userId: string
  days: number
  daily: ActivityHeatmapDay[]
  maxTotal: number
}

export function getActivityHeatmap(id: string, days = 30): Promise<ActivityHeatmapResponse> {
  return apiClient.get(`/users/${id}/activity-heatmap`, { params: { days } })
}

/**
 * 获取时令食材推荐食谱
 * GET /api/recipes/seasonal-ingredients?ingredients=xxx
 */
export function getSeasonalIngredientRecipes(ingredients: string[]) {
  return apiClient.get('/recipes/recommend', {
    params: { ingredients: ingredients.join(','), pageSize: 8 },
  })
}

/**
 * 获取用户成就列表
 * GET /api/achievements/user/:userId
 */
export interface AchievementItem {
  id: string
  userId: string
  type: string
  title: string
  description: string
  icon?: string
  unlockedAt: string
  progress?: number
  maxProgress?: number
}

export function getUserAchievements(userId: string): Promise<AchievementItem[]> {
  return apiClient.get(`/achievements/user/${userId}`)
}

// ─────────────────────────────────────────────────────────────────
// Comments API
// ─────────────────────────────────────────────────────────────────

export interface CommentUser {
  id: string
  username: string
  nickname?: string
}

export interface Comment {
  id: number
  content: string
  rating: number | null
  userId: string
  recipeId: string
  createdAt: string
  likesCount?: number
  isLiked?: boolean
  user?: CommentUser
}

export interface CommentStats {
  total: number
  ratedCount: number
  averageRating: number
  distribution: Record<number, number>
}

export interface CommentListResponse {
  data: {
    list: Comment[]
    total: number
    page: number
    pageSize: number
  }
}

/**
 * 获取食谱评论列表
 * GET /api/recipes/:recipeId/comments
 */
export function getComments(
  recipeId: string,
  params?: { page?: number; pageSize?: number; sort?: 'latest' | 'hot' }
): Promise<CommentListResponse> {
  return apiClient.get(`/recipes/${recipeId}/comments`, {
    params: { page: 1, pageSize: 20, ...params }
  })
}

/**
 * 获取评分统计
 * GET /api/recipes/:recipeId/comments/stats
 */
export function getCommentStats(recipeId: string): Promise<{ data: CommentStats }> {
  return apiClient.get(`/recipes/${recipeId}/comments/stats`)
}

/**
 * 发表评论
 * POST /api/recipes/:recipeId/comments
 */
export function createComment(
  recipeId: string,
  data: { content: string; rating?: number }
): Promise<{ data: Comment }> {
  return apiClient.post(`/recipes/${recipeId}/comments`, data)
}

/**
 * 删除评论
 * DELETE /api/comments/:id
 */
export function deleteComment(id: number): Promise<void> {
  return apiClient.delete(`/comments/${id}`)
}

/**
 * 点赞评论
 * POST /api/comments/:id/like
 */
export function likeComment(commentId: number): Promise<void> {
  return apiClient.post(`/comments/${commentId}/like`)
}

/**
 * 取消点赞
 * DELETE /api/comments/:id/like
 */
export function unlikeComment(commentId: number): Promise<void> {
  return apiClient.delete(`/comments/${commentId}/like`)
}

/**
 * 搜索食谱（含筛选参数）
 * GET /api/recipes/search?q=&category=&difficulty=&sortBy=
 */
export interface SearchFilters {
  q: string
  page?: number
  pageSize?: number
  category?: string
  difficulty?: string
  sortBy?: 'newest' | 'oldest' | 'cookTime_asc' | 'cookTime_desc'
}

export function searchRecipesWithFilters(filters: SearchFilters): Promise<any> {
  return apiClient.get('/recipes/search', { params: filters })
}

// ─────────────────────────────────────────────────────────────────
// Recipe CRUD API
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Import Recipe API
// ─────────────────────────────────────────────────────────────────

export interface ImportedRecipe {
  title: string
  description: string
  coverImage: string
  cookTime: number
  servings: number
  difficulty: string
  ingredients: Array<{ name: string; amount: number; unit: string }>
  steps: Array<{ stepNumber: number; content: string }>
  nutrition: Record<string, number> | null
}

/**
 * 从 URL 导入食谱
 * POST /api/recipes/import
 */
export function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  return apiClient.post('/recipes/import', { url }).then(res => res.data)
}

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
  tips?: string
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

// ─────────────────────────────────────────────────────────────────
// Collections API
// ─────────────────────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  description?: string
  recipeCount: number
  createdAt: string
  updatedAt?: string
}

export interface CollectionDetail {
  id: string
  name: string
  description?: string
  recipeCount: number
  createdAt: string
  updatedAt?: string
  recipes: Recipe[]
}

/**
 * 获取收藏夹列表
 * GET /api/collections
 */
export function getCollections(): Promise<{ list: Collection[] }> {
  return apiClient.get('/collections').then((res: any) => ({
    list: res.data || []
  }))
}

/**
 * 创建收藏夹
 * POST /api/collections
 */
export function createCollection(data: { name: string; description?: string }): Promise<Collection> {
  return apiClient.post('/collections', data).then((res: any) => res.data)
}

/**
 * 获取收藏夹详情（含食谱列表）
 * GET /api/collections/:id
 */
export function getCollection(id: string): Promise<CollectionDetail> {
  return apiClient.get(`/collections/${id}`).then((res: any) => res.data)
}

/**
 * 更新收藏夹
 * PUT /api/collections/:id
 */
export function updateCollection(id: string, data: { name?: string; description?: string }): Promise<Collection> {
  return apiClient.put(`/collections/${id}`, data).then((res: any) => res.data)
}

/**
 * 删除收藏夹
 * DELETE /api/collections/:id
 */
export function deleteCollection(id: string): Promise<void> {
  return apiClient.delete(`/collections/${id}`).then((res: any) => res.data)
}

/**
 * 将食谱添加到收藏夹
 * POST /api/collections/:id/recipes
 */
export function addRecipeToCollection(collectionId: string, recipeId: string): Promise<unknown> {
  return apiClient.post(`/collections/${collectionId}/recipes`, { recipeId }).then((res: any) => res.data)
}

/**
 * 从收藏夹移除食谱
 * DELETE /api/collections/:id/recipes/:recipeId
 */
export function removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
  return apiClient.delete(`/collections/${collectionId}/recipes/${recipeId}`).then((res: any) => res.data)
}

// ─────────────────────────────────────────────────────────────────
// Shopping List API
// ─────────────────────────────────────────────────────────────────

export interface ShoppingListItem {
  name: string
  amount?: number
  unit?: string
  checked: boolean
}

export interface ShoppingList {
  id: string
  name: string
  items: ShoppingListItem[]
  recipeId?: string
  createdAt: string
  updatedAt?: string
}

/**
 * 从食谱生成购物清单
 * POST /api/shopping-list/generate
 */
export function generateShoppingList(recipeIds: string[]): Promise<ShoppingList> {
  return apiClient.post('/shopping-list/generate', { recipeIds }).then((res: any) => res.data)
}

/**
 * 获取购物清单列表
 * GET /api/shopping-list
 */
export function getShoppingLists(): Promise<{ list: ShoppingList[] }> {
  return apiClient.get('/shopping-list').then((res: any) => ({
    list: res.data || []
  }))
}

/**
 * 更新购物清单
 * PUT /api/shopping-list/:id
 */
export function updateShoppingList(id: string, data: { name?: string; items?: ShoppingListItem[] }): Promise<ShoppingList> {
  return apiClient.put(`/shopping-list/${id}`, data).then((res: any) => res.data)
}

/**
 * 删除购物清单
 * DELETE /api/shopping-list/:id
 */
export function deleteShoppingList(id: string): Promise<void> {
  return apiClient.delete(`/shopping-list/${id}`).then((res: any) => res.data)
}

// ─────────────────────────────────────────────────────────────────

// ── Compare Types ──
export interface CompareRecipe {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  servings: number
  cookTime: string
  coverImage: string | null
  nutrition: Record<string, any> | null
  ingredients: { name: string; amount: number; unit: string }[]
  steps: { stepNumber: number; content: string }[]
  season: string
  qualityScore: number
  qualityLabel: string
  avgRating: number
  favoriteCount: number
  commentCount: number
  viewCount: number
}

export interface CompareSummary {
  totalCompared: number
  difficulties: string[]
  categories: string[]
  allDifferentDifficulty: boolean
  hasCommonDifficulty: boolean
  commonIngredientCount: number
  commonIngredients: string[]
  recipeIngredients: { recipeId: string; uniqueCount: number; uniqueIngredients: string[] }[]
}

export interface CompareResult {
  recipes: CompareRecipe[]
  summary: CompareSummary
}

// ── Preferences Types ──
export interface UserPreferences {
  diet: string
  cuisine: string
  difficulty: string
  maxCookTime: string
  allergies: string[]
  excludedIngredients: string[]
}

// ── Shopping List Item for add ──
export interface AddShoppingItem {
  name: string
  amount: number
  unit: string
}


// ── Compare Recipes ──
export function compareRecipes(recipeIds: string[]): Promise<CompareResult> {
  return apiClient.post('/recipes/compare', { recipeIds }).then((res: any) => res.data.data || res.data)
}

// ── Preferences ──
export function getPreferences(): Promise<UserPreferences> {
  return apiClient.get('/preferences/').then((res: any) => res.data.data || {})
}

export function updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiClient.put('/preferences/', prefs).then((res: any) => res.data.data)
}

export function getRecommendByPreference(): Promise<{ list: any[]; preferences: UserPreferences }> {
  return apiClient.get('/preferences/recommend-by-preference').then((res: any) => res.data.data || { list: [], preferences: {} })
}

// ── Shopping List Item Operations ──
export function addShoppingListItems(listId: string, items: AddShoppingItem[]): Promise<ShoppingList> {
  return apiClient.post(`/shopping-list/${listId}/items`, { items }).then((res: any) => res.data.data)
}

export function deleteShoppingListItem(listId: string, itemName: string): Promise<ShoppingList> {
  return apiClient.delete(`/shopping-list/${listId}/items/${encodeURIComponent(itemName)}`).then((res: any) => res.data.data)
}

// Share API
// ─────────────────────────────────────────────────────────────────

export interface ShareInfo {
  title: string
  description: string
  shareUrl: string
  shareText: string
}

/**
 * 获取食谱分享信息
 * GET /api/recipes/:id/share
 */
export function getShareInfo(id: string): Promise<ShareInfo> {
  return apiClient.get(`/recipes/${id}/share`).then((res: any) => res.data)
}

// ─────────────────────────────────────────────────────────────────
// Profile Update API
// ─────────────────────────────────────────────────────────────────

/**
 * 更新个人资料
 * PUT /api/auth/me
 */
export function updateProfile(data: { nickname?: string; avatar?: string }): Promise<UserProfile> {
  return apiClient.put(`/auth/me`, data).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// Follow API
// ─────────────────────────────────────────────────────────────────

export interface FollowStatus {
  isFollowing: boolean
}

export interface FollowUser {
  id: string
  username: string
  nickname?: string
  followedAt: string
}

export interface FollowListResponse {
  list: FollowUser[]
  total: number
  page: number
  pageSize: number
}

/**
 * 关注用户
 * POST /api/users/:id/follow
 */
export function followUser(id: string): Promise<{ followed: boolean }> {
  return apiClient.post(`/users/${id}/follow`).then(r => r.data?.data || r.data)
}

/**
 * 取消关注
 * DELETE /api/users/:id/follow
 */
export function unfollowUser(id: string): Promise<{ followed: boolean }> {
  return apiClient.delete(`/users/${id}/follow`).then(r => r.data?.data || r.data)
}

/**
 * 粉丝列表
 * GET /api/users/:id/followers
 */
export function getFollowers(id: string, params?: { page?: number; pageSize?: number }): Promise<FollowListResponse> {
  return apiClient.get(`/users/${id}/followers`, { params }).then(r => r.data?.data || r.data)
}

/**
 * 关注列表
 * GET /api/users/:id/following
 */
export function getFollowing(id: string, params?: { page?: number; pageSize?: number }): Promise<FollowListResponse> {
  return apiClient.get(`/users/${id}/following`, { params }).then(r => r.data?.data || r.data)
}

/**
 * 获取关注状态
 * GET /api/users/:id/follow-status
 */
export function getFollowStatus(id: string): Promise<FollowStatus> {
  return apiClient.get(`/users/${id}/follow-status`).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 排行榜相关类型与 API
// ─────────────────────────────────────────────────────────────────

export interface RankedRecipe {
  id: string
  title: string
  coverImage: string
  category: string
  difficulty: string
  cookTime: number
  description: string
  viewCount: number
  avgRating: number
  ratingCount: number
  favoriteCount: number
  commentCount: number
  qualityScore: number
  compositeScore: number
  rank: number
  qualityLabel: string | null
}

export interface RankingResponse {
  period: string
  sortBy?: string
  list: RankedRecipe[]
}

/**
 * 获取食谱排行榜
 * GET /api/recipes/rankings
 * @param period week | month | all
 * @param sortBy composite | views | rating
 */
export function getRankings(period: string = 'all', sortBy: string = 'composite'): Promise<RankingResponse> {
  return apiClient.get('/recipes/rankings', { params: { period, sortBy } }).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 版本历史相关类型与 API
// ─────────────────────────────────────────────────────────────────

export interface RecipeVersion {
  id: string
  recipeId: string
  version: number
  changes: {
    changedFields: string[]
    snapshot: Record<string, string>
  } | null
  summary: string | null
  createdAt: string
}

/**
 * 获取食谱版本历史
 * GET /api/recipes/:id/versions
 */
export function getRecipeVersions(id: string): Promise<RecipeVersion[]> {
  return apiClient.get(`/recipes/${id}/versions`).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 内容发现 API
// ─────────────────────────────────────────────────────────────────

/**
 * 获取热门食谱
 * GET /api/recipes/popular
 */
export function getPopularRecipes(params?: { page?: number; pageSize?: number }): Promise<{ list: Recipe[]; total: number }> {
  return apiClient.get('/recipes/popular', { params }).then(r => r.data?.data || r.data)
}

/**
 * 新用户引导推荐
 * GET /api/recipes/new-user-recommend
 */
export function getNewUserRecommend(params?: { difficulty?: string; season?: string }): Promise<{ list: Recipe[]; matched: { difficulty?: string; season?: string } }> {
  return apiClient.get('/recipes/new-user-recommend', { params }).then(r => r.data?.data || r.data)
}

/**
 * 质量检查列表
 * GET /api/recipes/quality-check
 */
export function getQualityCheck(params?: { page?: number; pageSize?: number }): Promise<{ list: any[]; total: number; summary: { passedCount: number; failedCount: number; passRate: number } }> {
  return apiClient.get('/recipes/quality-check', { params }).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 每周餐单计划 (Meal Plan)
// ─────────────────────────────────────────────────────────────────

export interface MealPlanMeal {
  day: number          // 0=周一 .. 6=周日
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipeId: string
  recipeTitle: string
  recipeImage?: string
}

export interface MealPlan {
  id: string
  userId: string
  weekStart: string     // YYYY-MM-DD
  meals: MealPlanMeal[]
  createdAt: string
  updatedAt: string
}

export interface MealPlanListResponse {
  code: number
  message: string
  data: MealPlan[]
}

/**
 * 获取餐单列表
 * GET /api/meal-plans?weekStart=
 */
export function getMealPlans(weekStart?: string): Promise<MealPlan[]> {
  const params = weekStart ? { weekStart } : {}
  return apiClient.get('/meal-plans', { params }).then(r => r.data?.data || [])
}

/**
 * 创建餐单
 * POST /api/meal-plans
 */
export function createMealPlan(weekStart: string, meals: MealPlanMeal[]): Promise<MealPlan> {
  return apiClient.post('/meal-plans', { weekStart, meals }).then(r => r.data?.data || r.data)
}

/**
 * 更新餐单
 * PUT /api/meal-plans/:id
 */
export function updateMealPlan(id: string, meals: MealPlanMeal[]): Promise<MealPlan> {
  return apiClient.put(`/meal-plans/${id}`, { meals }).then(r => r.data?.data || r.data)
}

/**
 * 删除餐单
 * DELETE /api/meal-plans/:id
 */
export function deleteMealPlan(id: string): Promise<void> {
  return apiClient.delete(`/meal-plans/${id}`).then(() => {})
}

/**
 * 从餐单生成购物清单
 * POST /api/meal-plans/:id/generate-shopping-list
 */
export function generateShoppingListFromMealPlan(id: string): Promise<any> {
  return apiClient.post(`/meal-plans/${id}/generate-shopping-list`).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 烹饪日志 (Cooking Journal)
// ─────────────────────────────────────────────────────────────────

export interface CookingLog {
  id: string
  userId: string
  recipeId: string
  recipeTitle: string
  recipeCategory: string | null
  cookedAt: string
  rating: number
  notes: string | null
  duration: number | null
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface CookingLogStats {
  totalCooked: number
  thisMonthCount: number
  byCategory: Record<string, number>
  byMonth: Array<{ month: string; count: number }>
  averageRating: number
}

export interface CookingLogListResponse {
  code: number
  message: string
  data: {
    list: CookingLog[]
    total: number
    page: number
    pageSize: number
  }
}

export interface CookingLogStatsResponse {
  code: number
  message: string
  data: CookingLogStats
}

/**
 * 获取烹饪日志列表
 * GET /api/cooking-logs
 */
export function getCookingLogs(params: { page?: number; pageSize?: number; recipeId?: string } = {}): Promise<{ list: CookingLog[]; total: number; page: number; pageSize: number }> {
  return apiClient.get('/cooking-logs', { params }).then(r => r.data?.data || { list: [], total: 0, page: 1, pageSize: 20 })
}

/**
 * 创建烹饪日志
 * POST /api/cooking-logs
 */
export function createCookingLog(data: { recipeId: string; cookedAt?: string; rating: number; notes?: string; duration?: number; photoUrl?: string }): Promise<CookingLog> {
  return apiClient.post('/cooking-logs', data).then(r => r.data?.data || r.data)
}

/**
 * 更新烹饪日志
 * PUT /api/cooking-logs/:id
 */
export function updateCookingLog(id: string, data: Partial<{ rating: number; notes: string; duration: number; photoUrl: string; cookedAt: string }>): Promise<CookingLog> {
  return apiClient.put(`/cooking-logs/${id}`, data).then(r => r.data?.data || r.data)
}

/**
 * 删除烹饪日志
 * DELETE /api/cooking-logs/:id
 */
export function deleteCookingLog(id: string): Promise<void> {
  return apiClient.delete(`/cooking-logs/${id}`).then(() => {})
}

/**
 * 获取烹饪统计
 * GET /api/cooking-logs/stats
 */
export function getCookingLogStats(): Promise<CookingLogStats> {
  return apiClient.get('/cooking-logs/stats').then(r => r.data?.data || {})
}

// ─────────────────────────────────────────────────────────────────
// 迭代#34: 食谱视频嵌入
// ─────────────────────────────────────────────────────────────────

export interface VideoEmbed {
  id: string
  recipeId: string
  videoUrl: string
  platform: 'generic' | 'youtube' | 'bilibili' | 'tiktok'
  coverImage?: string
  title?: string
  duration?: number
  sortOrder: number
  createdAt: string
}

/**
 * 获取食谱视频列表
 * GET /api/recipes/:recipeId/videos
 */
export function getRecipeVideos(recipeId: string): Promise<{ list: VideoEmbed[]; total: number }> {
  return apiClient.get(`/recipes/${recipeId}/videos`).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 添加视频到食谱
 * POST /api/recipes/:recipeId/videos
 */
export function addRecipeVideo(recipeId: string, data: { videoUrl: string; platform?: string; coverImage?: string; title?: string; duration?: number }): Promise<VideoEmbed> {
  return apiClient.post(`/recipes/${recipeId}/videos`, data).then(r => r.data?.data || r.data)
}

/**
 * 删除视频
 * DELETE /api/videos/:id
 */
export function deleteRecipeVideo(id: string): Promise<void> {
  return apiClient.delete(`/videos/${id}`).then(r => r.data)
}

// ─────────────────────────────────────────────────────────────────
// 迭代#34: 挑战赛系统
// ─────────────────────────────────────────────────────────────────

export interface Challenge {
  id: string
  title: string
  description?: string
  theme: string
  coverImage?: string
  startDate?: string
  endDate?: string
  status: 'draft' | 'active' | 'voting' | 'closed'
  rules?: string
  prize?: string
  submissionCount: number
  voteCount: number
  createdBy?: string
  creator?: { id: string; username: string; nickname?: string }
  createdAt: string
}

export interface ChallengeSubmission {
  id: string
  challengeId: string
  recipeId: string
  userId: string
  description?: string
  voteCount: number
  createdAt: string
  recipe?: Recipe
  submitter?: { id: string; username: string; nickname?: string }
}

export interface ChallengeRanking {
  rank: number
  id: string
  recipeId: string
  recipe?: Recipe
  submitter?: { id: string; username: string; nickname?: string }
  voteCount: number
  description?: string
}

/**
 * 获取挑战列表
 * GET /api/challenges
 */
export function getChallenges(params?: { status?: string; page?: number; pageSize?: number }): Promise<{ list: Challenge[]; total: number }> {
  return apiClient.get('/challenges', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取挑战详情
 * GET /api/challenges/:id
 */
export function getChallenge(id: string): Promise<Challenge> {
  return apiClient.get(`/challenges/${id}`).then(r => r.data?.data || r.data)
}

/**
 * 获取挑战投稿列表
 * GET /api/challenges/:id/submissions
 */
export function getChallengeSubmissions(challengeId: string, params?: { page?: number; pageSize?: number }): Promise<{ list: ChallengeSubmission[]; total: number }> {
  return apiClient.get(`/challenges/${challengeId}/submissions`, { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 用户投稿
 * POST /api/challenges/:id/submit
 */
export function submitToChallenge(challengeId: string, data: { recipeId: string; description?: string }): Promise<ChallengeSubmission> {
  return apiClient.post(`/challenges/${challengeId}/submit`, data).then(r => r.data?.data || r.data)
}

/**
 * 投票
 * POST /api/challenges/:id/vote
 */
export function voteChallenge(challengeId: string, submissionId: string): Promise<{ message: string }> {
  return apiClient.post(`/challenges/${challengeId}/vote`, { submissionId }).then(r => r.data)
}

/**
 * 获取排行榜
 * GET /api/challenges/:id/ranking
 */
export function getChallengeRanking(challengeId: string): Promise<{ list: ChallengeRanking[]; total: number }> {
  return apiClient.get(`/challenges/${challengeId}/ranking`).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取我的投稿
 * GET /api/my-submissions
 */
export function getMySubmissions(): Promise<{ list: any[]; total: number }> {
  return apiClient.get('/my-submissions').then(r => r.data?.data || { list: [], total: 0 })
}

// ─────────────────────────────────────────────────────────────────
// 迭代#34: 智能食材搜索
// ─────────────────────────────────────────────────────────────────

export interface IngredientSearchResult {
  id: string
  title: string
  coverImage?: string
  description?: string
  category?: string
  difficulty?: string
  cookTime?: number
  servings?: number
  favoriteCount: number
  matchRatio: number
  matchCount: number
  totalIngredients: number
  matchedIngredients: string[]
  missingIngredients: string[]
  nutrition?: any
}

export interface AiRecipeRecommend {
  title: string
  description: string
  ingredients: { name: string; amount: string; unit: string }[]
  cookTime: number
  difficulty: string
  servings: number
}

/**
 * 手头食材搜索匹配食谱
 * POST /api/recipes/by-ingredients
 */
export function searchByIngredients(ingredients: string[]): Promise<{
  list: IngredientSearchResult[]
  total: number
  userIngredients: string[]
  aliasExpanded?: string[]
  aiRecommends?: AiRecipeRecommend[]
  aiGenerated?: boolean
}> {
  return apiClient.post('/recipes/by-ingredients', { ingredients }).then(r => r.data?.data || { list: [], total: 0, userIngredients: [] })
}

// ─────────────────────────────────────────────────────────────────
// 迭代#34: 厨房工具
// ─────────────────────────────────────────────────────────────────

export interface KitchenTool {
  id: string
  name: string
  category: string
  icon?: string
  description?: string
  essential: boolean
  createdAt: string
}

/**
 * 获取工具列表
 * GET /api/tools
 */
export function getKitchenTools(params?: { category?: string; essential?: boolean }): Promise<{ list: KitchenTool[]; total: number }> {
  return apiClient.get('/tools', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取食谱所需工具
 * GET /api/recipes/:recipeId/tools
 */
export function getRecipeTools(recipeId: string): Promise<{ list: KitchenTool[]; total: number }> {
  return apiClient.get(`/recipes/${recipeId}/tools`).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取食谱缺少的工具
 * GET /api/recipes/:recipeId/missing-tools
 */
export function getMissingTools(recipeId: string): Promise<{ list: KitchenTool[]; total: number }> {
  return apiClient.get(`/recipes/${recipeId}/missing-tools`).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取我的工具库
 * GET /api/my-tools
 */
export function getMyTools(): Promise<{ list: KitchenTool[]; total: number }> {
  return apiClient.get('/my-tools').then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 添加工具到我的工具库
 * POST /api/my-tools
 */
export function addMyTool(toolId: string): Promise<{ message: string }> {
  return apiClient.post('/my-tools', { toolId }).then(r => r.data)
}

/**
 * 从工具库移除工具
 * DELETE /api/my-tools/:toolId
 */
export function removeMyTool(toolId: string): Promise<{ message: string }> {
  return apiClient.delete(`/my-tools/${toolId}`).then(r => r.data)
}

/**
 * 批量添加工具到工具库
 * POST /api/my-tools/batch
 */
export function batchAddMyTools(toolIds: string[]): Promise<{ added: number }> {
  return apiClient.post('/my-tools/batch', { toolIds }).then(r => r.data?.data || { added: 0 })
}

// ─────────────────────────────────────────────────────────────────
// 迭代#35: 标签系统
// ─────────────────────────────────────────────────────────────────

export interface TagItem {
  tag: string
  category?: string
  count: number
}

/**
 * 获取热门标签
 * GET /api/tags/popular
 */
export function getPopularTags(params?: { limit?: number; category?: string; minCount?: number }): Promise<{ list: TagItem[]; total: number }> {
  return apiClient.get('/tags/popular', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 搜索标签
 * GET /api/tags/search
 */
export function searchTags(q: string): Promise<{ list: TagItem[]; total: number }> {
  return apiClient.get('/tags/search', { params: { q } }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 记录标签点击
 * POST /api/tags/log
 */
export function logTag(tag: string, category?: string): Promise<{ code: number }> {
  return apiClient.post('/tags/log', { tag, category }).then(r => r.data)
}

// ─────────────────────────────────────────────────────────────────
// 迭代#35: 质量评分详情
// ─────────────────────────────────────────────────────────────────

export interface QualityDetail {
  score: number
  maxScore: number
  detail: string
}

export interface QualityDetailsData {
  recipeId: string
  recipeTitle: string
  overall: QualityDetail & { label: string }
  ingredientCompleteness: QualityDetail & { ingredientCount: number; hasRichDesc: boolean }
  stepClarity: QualityDetail & { stepCount: number; stepsWithTime: number; stepsWithDetail: number }
  nutritionInfo: QualityDetail & { filledCount: number; totalCount: number; filled: string; missing: string }
}

/**
 * 获取质量评分详情
 * GET /api/recipes/:id/quality-details
 */
export function getQualityDetails(id: string): Promise<QualityDetailsData> {
  return apiClient.get(`/recipes/${id}/quality-details`).then(r => r.data?.data || r.data)
}

// ─────────────────────────────────────────────────────────────────
// 迭代#35: 用户行为追踪
// ─────────────────────────────────────────────────────────────────

export type BehaviorEventType = 'view' | 'favorite' | 'cook' | 'share'

export interface BehaviorHistoryItem {
  id: string
  eventType: BehaviorEventType
  recipeId: string
  timestamp: string
  recipe?: Recipe | null
}

export interface BehaviorStats {
  viewCount: number
  favoriteCount: number
  cookCount: number
  shareCount: number
  total: number
}

/**
 * 记录用户行为
 * POST /api/behaviors/track
 */
export function trackBehavior(eventType: BehaviorEventType, recipeId: string, metadata?: any): Promise<{ code: number; eventId?: string; deduped?: boolean }> {
  return apiClient.post('/behaviors/track', { eventType, recipeId, metadata }).then(r => r.data)
}

/**
 * 匿名追踪
 * POST /api/behaviors/track-anonymous
 */
export function trackBehaviorAnonymous(eventType: 'view' | 'share', recipeId: string): Promise<{ code: number }> {
  return apiClient.post('/behaviors/track-anonymous', { eventType, recipeId }).then(r => r.data)
}

/**
 * 获取行为历史
 * GET /api/behaviors/history
 */
export function getBehaviorHistory(params?: { limit?: number; offset?: number; eventType?: BehaviorEventType }): Promise<{ list: BehaviorHistoryItem[]; total: number }> {
  return apiClient.get('/behaviors/history', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/**
 * 获取行为统计
 * GET /api/behaviors/stats
 */
export function getBehaviorStats(): Promise<BehaviorStats> {
  return apiClient.get('/behaviors/stats').then(r => r.data?.data || {})
}

// ─────────────────────────────────────────────────────────────────
// 迭代#35: 食谱导出
// ─────────────────────────────────────────────────────────────────

/**
 * 导出食谱 Markdown
 * GET /api/recipes/:id/export?format=md
 */
export function exportRecipeMD(id: string): Promise<Blob | string> {
  return apiClient.get(`/recipes/${id}/export?format=md`, {
    responseType: 'blob',
  }).then(r => r.data)
}

/**
 * 导出食谱 PDF
 * GET /api/recipes/:id/export?format=pdf
 */
export function exportRecipePDF(id: string): Promise<Blob> {
  return apiClient.get(`/recipes/${id}/export?format=pdf`, {
    responseType: 'blob',
  }).then(r => r.data)
}

// ═══════════════════════════════════════════════════════════
// 迭代#37: 收藏夹增强
// ═══════════════════════════════════════════════════════════

/** 添加收藏夹评论 */
export function addCollectionComment(collectionId: string, content: string): Promise<any> {
  return apiClient.post(`/collections/${collectionId}/comments`, { content }).then(r => r.data?.data || r.data)
}

/** 获取收藏夹评论 */
export function getCollectionComments(collectionId: string, params?: { page?: number; pageSize?: number }): Promise<{ list: any[]; total: number }> {
  return apiClient.get(`/collections/${collectionId}/comments`, { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/** 删除收藏夹评论 */
export function deleteCollectionComment(collectionId: string, commentId: string): Promise<any> {
  return apiClient.delete(`/collections/${collectionId}/comments/${commentId}`).then(r => r.data)
}

// ═══════════════════════════════════════════════════════════
// 迭代#37: 食材库存管理
// ═══════════════════════════════════════════════════════════

export interface PantryItem {
  id: string
  userId: string
  name: string
  quantity: number
  unit: string
  category: string
  expiryDate: string | null
  notes: string | null
  addedAt: string
  updatedAt: string
}

/** 获取库存列表 */
export function getPantryItems(params?: { category?: string; expiring?: number; search?: string; page?: number; pageSize?: number; sortBy?: string; sortOrder?: string }): Promise<{ list: PantryItem[]; total: number }> {
  return apiClient.get('/pantry', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/** 添加库存项 */
export function addPantryItem(data: { name: string; quantity?: number; unit?: string; category?: string; expiryDate?: string; notes?: string }): Promise<PantryItem> {
  return apiClient.post('/pantry', data).then(r => r.data?.data)
}

/** 更新库存项 */
export function updatePantryItem(id: string, data: { name?: string; quantity?: number; unit?: string; category?: string; expiryDate?: string; notes?: string }): Promise<PantryItem> {
  return apiClient.put(`/pantry/${id}`, data).then(r => r.data?.data)
}

/** 删除库存项 */
export function deletePantryItem(id: string): Promise<any> {
  return apiClient.delete(`/pantry/${id}`).then(r => r.data)
}

/** 获取即将过期食材 */
export function getExpiringItems(days: number = 3): Promise<{ list: PantryItem[]; count: number }> {
  return apiClient.get('/pantry/expiring', { params: { days } }).then(r => r.data?.data || { list: [], count: 0 })
}

/** 获取已过期食材 */
export function getExpiredItems(): Promise<{ list: PantryItem[]; count: number }> {
  return apiClient.get('/pantry/expired').then(r => r.data?.data || { list: [], count: 0 })
}

/** 基于库存食谱推荐 */
export function getPantrySuggestions(): Promise<{ list: any[]; total: number; message?: string }> {
  return apiClient.get('/pantry/suggestions').then(r => r.data?.data || { list: [], total: 0 })
}

/** 批量快速添加 */
export function quickAddPantryItems(items: { name: string; quantity?: number; unit?: string; category?: string; expiryDate?: string }[]): Promise<{ list: PantryItem[]; count: number }> {
  return apiClient.post('/pantry/quick-add', { items }).then(r => r.data?.data)
}

/** 批量删除库存项 */
export function batchDeletePantryItems(ids: string[]): Promise<any> {
  return apiClient.post('/pantry/batch-delete', { ids }).then(r => r.data)
}

// ═══════════════════════════════════════════════════════════
// 迭代#37: 营养追踪
// ═══════════════════════════════════════════════════════════

export interface NutritionLog {
  id: string
  userId: string
  recipeId: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  servings: number
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
  recipe?: any
  createdAt: string
}

export interface NutritionGoal {
  id: string
  userId: string
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

/** 添加饮食记录 */
export function addNutritionLog(data: { recipeId: string; date: string; mealType: string; servings?: number }): Promise<NutritionLog> {
  return apiClient.post('/nutrition/logs', data).then(r => r.data?.data)
}

/** 获取饮食记录 */
export function getNutritionLogs(params?: { date?: string; mealType?: string; page?: number; pageSize?: number }): Promise<{ list: NutritionLog[]; total: number }> {
  return apiClient.get('/nutrition/logs', { params }).then(r => r.data?.data || { list: [], total: 0 })
}

/** 更新饮食记录 */
export function updateNutritionLog(id: string, data: { servings?: number; date?: string; mealType?: string }): Promise<NutritionLog> {
  return apiClient.put(`/nutrition/logs/${id}`, data).then(r => r.data?.data)
}

/** 删除饮食记录 */
export function deleteNutritionLog(id: string): Promise<any> {
  return apiClient.delete(`/nutrition/logs/${id}`).then(r => r.data)
}

/** 获取营养目标 */
export function getNutritionGoals(): Promise<NutritionGoal> {
  return apiClient.get('/nutrition/goals').then(r => r.data?.data)
}

/** 设置营养目标 */
export function setNutritionGoals(data: { calories?: number; protein?: number; fat?: number; carbs?: number; fiber?: number }): Promise<NutritionGoal> {
  return apiClient.put('/nutrition/goals', data).then(r => r.data?.data)
}

/** 获取推荐营养值 */
export function getRecommendedGoals(params?: { weight?: number; height?: number; age?: number; gender?: string; activity?: string }): Promise<NutritionGoal> {
  return apiClient.get('/nutrition/goals/recommended', { params }).then(r => r.data?.data)
}

/** 每日统计 */
export function getDailyNutritionStats(date?: string): Promise<any> {
  return apiClient.get('/nutrition/stats/daily', { params: { date } }).then(r => r.data?.data)
}

/** 每周统计 */
export function getWeeklyNutritionStats(start?: string, end?: string): Promise<any> {
  return apiClient.get('/nutrition/stats/weekly', { params: { start, end } }).then(r => r.data?.data)
}

/** 月度趋势 */
export function getMonthlyNutritionStats(year?: number, month?: number): Promise<any> {
  return apiClient.get('/nutrition/stats/monthly', { params: { year, month } }).then(r => r.data?.data)
}

/** 饮食建议 */
export function getNutritionSuggestions(date?: string): Promise<any> {
  return apiClient.get('/nutrition/suggestions', { params: { date } }).then(r => r.data?.data)
}

// ═══ 迭代#46: 作者等级信息 ═══
export interface AuthorLevelInfo {
  level: number
  title: string
  icon: string
  score: number
  nextLevelScore: number
  nextTitle: string | null
  progress: number
  isMaxLevel: boolean
}

export interface AuthorInfoResponse {
  user: { id: string; username: string; nickname: string | null }
  level: AuthorLevelInfo
}

/** 获取作者等级信息 */
export function getAuthorInfo(userId: string): Promise<AuthorInfoResponse> {
  return apiClient.get(`/users/${userId}/author-info`).then(r => r.data?.data || r.data)
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
  getSuggestions,
  recommendRecipes,
  getUserProfile,
  getUserRecipes,
  getUserStats,
  getUserFavorites,
  getActivityHeatmap,
  getSeasonalIngredientRecipes,
  getUserAchievements,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getComments,
  getCommentStats,
  createComment,
  deleteComment,
  getCollections,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  addRecipeToCollection,
  removeRecipeFromCollection,
  generateShoppingList,
  getShoppingLists,
  updateShoppingList,
  deleteShoppingList,
  getShareInfo,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  getRankings,
  getRecipeVersions,
  getPopularRecipes,
  getNewUserRecommend,
  getQualityCheck,
  compareRecipes,
  getPreferences,
  updatePreferences,
  getRecommendByPreference,
  addShoppingListItems,
  deleteShoppingListItem,
  getMealPlans,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  generateShoppingListFromMealPlan,
  getCookingLogs,
  createCookingLog,
  updateCookingLog,
  deleteCookingLog,
  getCookingLogStats,
  // 迭代#34
  getRecipeVideos,
  addRecipeVideo,
  deleteRecipeVideo,
  getChallenges,
  getChallenge,
  getChallengeSubmissions,
  submitToChallenge,
  voteChallenge,
  getChallengeRanking,
  getMySubmissions,
  searchByIngredients,
  getKitchenTools,
  getRecipeTools,
  getMissingTools,
  getMyTools,
  addMyTool,
  removeMyTool,
  batchAddMyTools,
  // ═══ 迭代#37: 收藏夹增强 ═══
  addCollectionComment,
  getCollectionComments,
  deleteCollectionComment,
  // ═══ 迭代#37: 食材库存 ═══
  getPantryItems,
  addPantryItem,
  updatePantryItem,
  deletePantryItem,
  getExpiringItems,
  getExpiredItems,
  getPantrySuggestions,
  quickAddPantryItems,
  batchDeletePantryItems,
  // ═══ 迭代#37: 营养追踪 ═══
  addNutritionLog,
  getNutritionLogs,
  updateNutritionLog,
  deleteNutritionLog,
  getNutritionGoals,
  setNutritionGoals,
  getRecommendedGoals,
  getDailyNutritionStats,
  getWeeklyNutritionStats,
  getMonthlyNutritionStats,
  getNutritionSuggestions,
  // ═══ 迭代#40 ═══
  getRecipeVersionDiff,
  getRecipeVersionsList,
  getEnrichedShoppingList,
  getShoppingListCopyText,
  getIngredientSubstitutions,
  // ═══ 迭代#42: 批量收藏 ═══
  batchFavorite,
  // ═══ 迭代#42: 批量添加购物清单 ═══
  batchShoppingAdd,
  // ═══ 迭代#42: 个人设置 ═══
  getSettings,
  updateProfile,   // from user routes
  updateNotificationPrefs,
  updatePrivacySettings,
  exportUserData,
  exportCsvFavorites,
  // ═══ 迭代#42: 个性化学推荐 ═══
  getPersonalizedRecommendations,
  getPopularRecommendations,
  // ═══ 迭代#42: 烹饪日志增强 ═══
  getCookingLogDetail,
  searchCookingLogs,
  getEnhancedCookingStats,
  // ═══ 迭代#46 ═══
  getAuthorInfo,
}

// ═══ 迭代#40: 食谱版本对比 ═══
export interface VersionInfo {
  version: number
  createdAt: string
  summary: string | null
}

export interface VersionDiffResponse {
  recipeTitle: string
  recipeId: string
  oldVersion: VersionInfo
  newVersion: VersionInfo
  changedFields: string[]
  fieldDiffs: Record<string, { old: any; new: any; status: 'added' | 'removed' | 'modified' }>
  totalChanged: number
}

export function getRecipeVersionDiff(recipeId: string, v1: number, v2: number): Promise<VersionDiffResponse> {
  return apiClient.get(`/recipe-versions/${recipeId}/diff`, { params: { v1, v2 } }).then(r => r.data?.data || r.data)
}

export function getRecipeVersionsList(recipeId: string): Promise<{ recipeTitle: string; recipeId: string; versions: any[]; total: number }> {
  return apiClient.get(`/recipe-versions/${recipeId}`).then(r => r.data?.data || r.data)
}

// ═══ 迭代#40: 购物清单增强 ═══
export function getEnrichedShoppingList(id: string): Promise<any> {
  return apiClient.get(`/shopping-list/${id}/enriched`).then(r => r.data?.data || r.data)
}

export function getShoppingListCopyText(id: string): Promise<{ text: string; name: string; totalEstimate: number }> {
  return apiClient.get(`/shopping-list/${id}/copy-text`).then(r => r.data?.data || r.data)
}

// ═══ 迭代#40: 食材替换 ═══
export function getIngredientSubstitutions(recipeId: string, filters?: { avoidAllergens?: string; diet?: string }): Promise<any> {
  return apiClient.post(`/recipes/${recipeId}/substitutions`, filters || {}).then(r => r.data?.data || r.data)
}

// ═══ 迭代#42: 批量收藏 ═══
export function batchFavorite(recipeIds: number[], action: 'add' | 'remove'): Promise<{ affected: number }> {
  return apiClient.post('/favorites/batch', { recipeIds, action }).then(r => r.data?.data || r.data)
}

// ═══ 迭代#42: 批量添加到购物清单 ═══
export function batchShoppingAdd(recipeIds: number[]): Promise<{ added: number; items: any[]; listId: string }> {
  return apiClient.post('/shopping-list/batch', { recipeIds }).then(r => r.data?.data || r.data)
}

// ═══ 迭代#42: 个人设置 ═══
export function getSettings(): Promise<{ profile: any; notifications: any; privacy: any; diet: string; cuisine: string; difficulty: string; maxCookTime: string; allergies: string[] }> {
  return apiClient.get('/settings').then(r => r.data?.data || r.data)
}
export function updateSettingsProfile(data: { nickname?: string }): Promise<{ nickname: string }> {
  return apiClient.put('/settings/profile', data).then(r => r.data?.data || r.data)
}
export function updateNotificationPrefs(data: { commentReply?: boolean; followUpdate?: boolean; challenge?: boolean; system?: boolean }): Promise<any> {
  return apiClient.put('/settings/notifications', data).then(r => r.data?.data || r.data)
}
export function updatePrivacySettings(data: { collectionVisibility?: string; cookingLogVisibility?: string }): Promise<any> {
  return apiClient.put('/settings/privacy', data).then(r => r.data?.data || r.data)
}
export function exportUserData(): Promise<any> {
  return apiClient.get('/settings/export').then(r => r.data?.data || r.data)
}
export function exportCsvFavorites(): Promise<any> {
  return apiClient.get('/settings/export/csv', { responseType: 'blob' }).then(r => r.data)
}

// ═══ 迭代#42: 个性化推荐 ═══
export function getPersonalizedRecommendations(limit?: number): Promise<{ recipes: any[] }> {
  return apiClient.get('/recommendations/personalized', { params: { limit } }).then(r => r.data?.data || r.data)
}
export function getPopularRecommendations(limit?: number): Promise<{ recipes: any[] }> {
  return apiClient.get('/recommendations/popular', { params: { limit } }).then(r => r.data?.data || r.data)
}

// ═══ 迭代#42: 烹饪日志增强 ═══
export function getCookingLogDetail(id: string): Promise<any> {
  return apiClient.get('/cooking-logs/detail/' + id).then(r => r.data?.data || r.data)
}
export function searchCookingLogs(params: { q?: string; startDate?: string; endDate?: string; minRating?: number; maxRating?: number; page?: number; pageSize?: number }): Promise<{ logs: any[]; total: number; page: number; pageSize: number; totalPages: number }> {
  return apiClient.get('/cooking-logs/search', { params }).then(r => r.data?.data || r.data)
}
export function getEnhancedCookingStats(): Promise<{ weeklyCount: number; dailyTrend: any[]; mostCooked: any[]; achievement: any }> {
  return apiClient.get('/cooking-logs/stats/enhanced').then(r => r.data?.data || r.data)
}

// ═══ 迭代#43: 食谱草稿系统 ═══
export interface Draft {
  id: string
  title: string
  description?: string
  category?: string
  ingredients?: any[]
  steps?: any[]
  servings?: number
  difficulty?: string
  cookTime?: number
  coverImage?: string
  tips?: string
  categoryTags?: string[]
  season?: string
  status: 'draft' | 'scheduled' | 'published'
  scheduledPublishAt?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export function getDrafts(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ drafts: Draft[]; total: number; page: number; pageSize: number }> {
  return apiClient.get('/drafts', { params }).then(r => r.data?.data || r.data)
}

export function getDraft(id: string): Promise<Draft> {
  return apiClient.get('/drafts/' + id).then(r => r.data?.data || r.data)
}

export function saveDraft(data: Partial<Draft>): Promise<Draft> {
  return apiClient.post('/drafts', data).then(r => r.data?.data || r.data)
}

export function updateDraft(id: string, data: Partial<Draft>): Promise<Draft> {
  return apiClient.put('/drafts/' + id, data).then(r => r.data?.data || r.data)
}

export function deleteDraft(id: string): Promise<void> {
  return apiClient.delete('/drafts/' + id).then(r => r.data?.data || r.data)
}

export function publishDraft(id: string): Promise<{ recipe: any; draft: Draft }> {
  return apiClient.post('/drafts/' + id + '/publish').then(r => r.data?.data || r.data)
}

// ═══ 迭代#43: 作者统计仪表板 ═══
export interface DashboardData {
  basic: { totalRecipes: number; totalViews: number; totalFavorites: number; totalComments: number; totalPoints: number }
  viewTrend: { date: string; views: number }[]
  favTrend: { date: string; favorites: number }[]
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  wordCloud: { text: string; value: number }[]
  topRecipes: { id: string; title: string; views: number; favorites: number; qualityScore: number; points: number }[]
}

export function getDashboard(): Promise<DashboardData> {
  return apiClient.get('/dashboard').then(r => r.data?.data || r.data)
}

// ═══ 迭代#43: 内容审核 ═══
export interface ReviewQueueItem {
  recipes: { items: any[]; total: number }
  comments: { items: any[]; total: number }
}

export function getReviewQueue(params?: { type?: string; threshold?: number; page?: number; pageSize?: number }): Promise<ReviewQueueItem> {
  return apiClient.get('/admin/review-queue', { params }).then(r => r.data?.data || r.data)
}

export function submitReviewBatch(items: { type: string; id: string; action: string; reason?: string }[]): Promise<{ results: any[] }> {
  return apiClient.post('/admin/review-batch', { items }).then(r => r.data?.data || r.data)
}

export function getReviewHistory(params?: { page?: number; pageSize?: number }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
  return apiClient.get('/admin/review-history', { params }).then(r => r.data?.data || r.data)
}

export function markCommentFeatured(id: string | number, featured: boolean): Promise<void> {
  return apiClient.post('/comments/' + id + '/feature', { featured }).then(r => r.data?.data || r.data)
}

export function getHotComments(recipeId: string, limit?: number): Promise<any[]> {
  return apiClient.get('/comments/' + recipeId + '/hot', { params: { limit } }).then(r => r.data?.data || r.data)
}

// ═══ 迭代#45: 通知系统 ═══
export interface NotificationItem {
  id: string
  userId: string
  actorId: string | null
  type: 'follow' | 'comment' | 'reply' | 'favorite' | 'collection_add' | 'meal_plan_reminder' | 'cooking_log_reminder' | 'achievement_unlock' | 'system'
  message: string
  link: string | null
  targetId: string | null
  targetType: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationListResponse {
  list: NotificationItem[]
  total: number
  page: number
  pageSize: number
  unreadCount: number
}

export interface NotificationPreference {
  inApp: boolean
  push: boolean
}

export interface PushSubscriptionInfo {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
  createdAt: string
  updatedAt: string
}

// 获取通知列表（支持分页、类型筛选、未读筛选）
export function getNotifications(params?: {
  page?: number
  pageSize?: number
  type?: string
  unread?: boolean
}): Promise<NotificationListResponse> {
  const queryParams: Record<string, string> = {}
  if (params?.page) queryParams.page = String(params.page)
  if (params?.pageSize) queryParams.pageSize = String(params.pageSize)
  if (params?.type) queryParams.type = params.type
  if (params?.unread) queryParams.unread = 'true'
  return apiClient.get('/notifications', { params: queryParams }).then(r => r.data?.data || r.data)
}

// 获取未读通知数量
export function getUnreadNotificationCount(): Promise<{ count: number }> {
  return apiClient.get('/notifications/unread-count').then(r => r.data?.data || r.data)
}

// 标记单条通知为已读
export function markNotificationRead(id: string): Promise<void> {
  return apiClient.put('/notifications/' + id + '/read').then(r => r.data?.data || r.data)
}

// 标记所有通知为已读
export function markAllNotificationsRead(): Promise<void> {
  return apiClient.put('/notifications/read-all').then(r => r.data?.data || r.data)
}

// 删除通知
export function deleteNotification(id: string): Promise<void> {
  return apiClient.delete('/notifications/' + id).then(r => r.data?.data || r.data)
}

// 获取推送订阅
export function getPushSubscriptions(): Promise<PushSubscriptionInfo[]> {
  return apiClient.get('/push/subscription/my').then(r => r.data?.data || r.data)
}

// 注册推送订阅
export function registerPushSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}): Promise<PushSubscriptionInfo> {
  return apiClient.post('/push/subscription', subscription).then(r => r.data?.data || r.data)
}

// 取消推送订阅
export function unregisterPushSubscription(id: string): Promise<void> {
  return apiClient.delete('/push/subscription/' + id).then(r => r.data?.data || r.data)
}

// 获取通知偏好
export function getNotificationPreferences(): Promise<Record<string, NotificationPreference>> {
  return apiClient.get('/notification-preferences').then(r => r.data?.data || r.data)
}

// 更新通知偏好
export function updateNotificationPreferences(prefs: Record<string, NotificationPreference>): Promise<void> {
  return apiClient.put('/notification-preferences', prefs).then(r => r.data?.data || r.data)
}

