'use strict'

/**
 * routes/index.js
 * 路由总入口
 *
 * 职责：
 *   - 挂载 auth 路由（/api/auth）    → 无需认证
 *   - 挂载 recipes 路由（/api/recipes） → 混合（列表公开，增删改需认证）
 *   - 挂载 users 路由（/api/users）   → 无需认证
 *   - 挂载 favorites 路由（/api/favorites） → 需认证
 */

const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const authRoutes = require('./auth')
const recipeRoutes = require('./recipes')
const userRoutes = require('./users')
const followRoutes = require('./follows')
const feedRoutes = require('./feed')
const favoriteRoutes = require('./favorites')
const commentRoutes = require('./comments')
const collectionRoutes = require('./collections')
const shoppingListRoutes = require('./shoppingList')
const importRoutes = require('./import')
const compareRoutes = require('./compare')
const preferencesRoutes = require('./preferences')
const seasonalRoutes = require('./seasonal')
const mealPlanRoutes = require('./mealPlan')
const cookingLogRoutes = require('./cookingLog')

// 不需要 auth 的路由
router.use('/auth', authRoutes)

// 评论路由必须在食谱路由之前，确保 /recipes/:recipeId/comments 不被 /recipes/:id 拦截
router.use('/', commentRoutes)

// 食谱对比（无需认证，必须在 recipeRoutes 之前避免 /:id 拦截 /compare）
router.use('/recipes/compare', compareRoutes)

// 季节性推荐（无需认证，必须在 recipeRoutes 之前避免 /:id 拦截 /seasonal）
router.use('/recipes/seasonal', seasonalRoutes)

router.use('/recipes', recipeRoutes)
router.use('/users', userRoutes)

// 用户关注路由（部分需认证，在 routes/follows.js 中按需使用 auth 中间件）
router.use('/users', followRoutes)

// 动态流
router.use('/feed', auth, feedRoutes)

// 需要 auth 的路由（shopping-list, import）
router.use('/shopping-list', auth, shoppingListRoutes)
router.use('/recipes/import', importRoutes)

// 收藏夹（auth 在内部按需处理，/public 无需认证）
router.use('/collections', collectionRoutes)

// 用户偏好（需认证）
router.use('/preferences', preferencesRoutes)

// 通知系统（全部需认证）
router.use('/notifications', require('./notification'))

// 成就系统（按需处理 auth）
router.use('/achievements', require('./achievement'))

// 每周餐单计划（需认证）
router.use('/meal-plans', auth, mealPlanRoutes)

// 烹饪日志（需认证）
router.use('/cooking-logs', auth, cookingLogRoutes)

// 举报系统
router.use('/reports', require('./reports'))

// 迭代#34: 食谱视频嵌入
router.use('/', require('./videos'))

// 迭代#34: 挑战赛系统
router.use('/', require('./challenges'))

// 迭代#34: 智能食材搜索
router.use('/', require('./ingredientSearch'))

// 迭代#34: 厨房工具管理
router.use('/', require('./kitchenTools'))

// 迭代#35: 标签系统（热门标签 / 标签搜索 / 标签建议）
router.use('/', require('./tags'))

// 迭代#35: 质量评分详情（多维评分）
router.use('/', require('./quality'))

// 迭代#35: 用户行为追踪
router.use('/', require('./behaviors'))

// 迭代#35: 食谱导出（Markdown/PDF）
router.use('/', require('./export'))

// 迭代#37: 食材库存管理
router.use('/pantry', require('./pantry'))

// 迭代#37: 营养追踪
router.use('/nutrition', require('./nutrition'))

// 需要 auth 的路由（favorites）
router.use('/favorites', auth)
router.get('/favorites', favoriteRoutes.getFavorites)
router.post('/favorites', favoriteRoutes.addFavorite)
router.delete('/favorites/:recipeId', favoriteRoutes.removeFavorite)
router.get('/favorites/:recipeId/status', favoriteRoutes.getFavoriteStatus)
router.get('/favorites/:recipeId/count', favoriteRoutes.getFavoriteCount)

module.exports = router