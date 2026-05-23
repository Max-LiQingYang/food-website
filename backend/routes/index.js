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

// 不需要 auth 的路由
router.use('/auth', authRoutes)

// 评论路由必须在食谱路由之前，确保 /recipes/:recipeId/comments 不被 /recipes/:id 拦截
router.use('/', commentRoutes)

// 食谱对比（无需认证，必须在 recipeRoutes 之前避免 /:id 拦截 /compare）
router.use('/recipes', compareRoutes)

router.use('/recipes', recipeRoutes)
router.use('/users', userRoutes)

// 用户关注路由（部分需认证，在 routes/follows.js 中按需使用 auth 中间件）
router.use('/users', followRoutes)

// 动态流
router.use('/feed', auth, feedRoutes)

// 需要 auth 的路由（collections, shopping-list, import）
router.use('/collections', auth, collectionRoutes)
router.use('/shopping-list', auth, shoppingListRoutes)
router.use('/recipes/import', importRoutes)

// 用户偏好（需认证）
router.use('/preferences', preferencesRoutes)

// 需要 auth 的路由（favorites）
router.use('/favorites', auth)
router.get('/favorites', favoriteRoutes.getFavorites)
router.post('/favorites', favoriteRoutes.addFavorite)
router.delete('/favorites/:recipeId', favoriteRoutes.removeFavorite)
router.get('/favorites/:recipeId/status', favoriteRoutes.getFavoriteStatus)
router.get('/favorites/:recipeId/count', favoriteRoutes.getFavoriteCount)

module.exports = router