'use strict'

/**
 * routes/index.js
 * 路由总入口
 *
 * 职责：
 *   - 统一挂载 auth 中间件（JWT 认证）
 *   - 挂载 favorites 路由
 *   - 导出合并后的 router
 */

const express = require('express')
const router = express.Router()

const auth = require('../middleware/auth')
const favoriteRoutes = require('./favorites')

/**
 * 所有 /api/favorites 路由先经过 JWT 认证
 * 认证通过后：req.userId 已由 auth 中间件注入
 */
router.use(auth)

// 挂载收藏相关路由
router.get('/', favoriteRoutes.getFavorites)
router.post('/', favoriteRoutes.addFavorite)
router.delete('/:recipeId', favoriteRoutes.removeFavorite)
router.get('/:recipeId/status', favoriteRoutes.getFavoriteStatus)

module.exports = router
