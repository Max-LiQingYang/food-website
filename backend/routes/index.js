'use strict'

/**
 * routes/index.js
 * 路由总入口
 *
 * 职责：
 *   - 挂载 auth 路由（/api/auth）    → 无需认证
 *   - 挂载 recipes 路由（/api/recipes） → 无需认证
 *   - 挂载 favorites 路由（/api/favorites） → 需认证
 */

const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const authRoutes = require('./auth')
const recipeRoutes = require('./recipes')
const favoriteRoutes = require('./favorites')

// 不需要 auth 的路由
router.use('/auth', authRoutes)
router.use('/recipes', recipeRoutes)

// 需要 auth 的路由（favorites）
router.use('/favorites', auth)
router.get('/favorites', favoriteRoutes.getFavorites)
router.post('/favorites', favoriteRoutes.addFavorite)
router.delete('/favorites/:recipeId', favoriteRoutes.removeFavorite)
router.get('/favorites/:recipeId/status', favoriteRoutes.getFavoriteStatus)
router.get('/favorites/:recipeId/count', favoriteRoutes.getFavoriteCount)

module.exports = router
