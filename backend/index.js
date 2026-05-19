'use strict'

const express = require('express')
const router = express.Router()

const favoriteRoutes = require('./routes/favorites')

/**
 * 路由入口 — 挂载所有 favorites 相关路由
 *
 * 前置中间件（建议在 app.js / routes/index.js 中统一配置）：
 *   - authMiddleware   → 解析 req.userId，未登录则 401
 *   - errorMiddleware  → 全局错误处理
 *
 * 路由约定（符合前端 api.js）：
 *   GET    /api/favorites              → 获取收藏列表（分页）
 *   POST   /api/favorites              → 添加收藏
 *   DELETE /api/favorites/:recipeId   → 取消收藏
 *   GET    /api/favorites/:recipeId/status → 查询收藏状态
 */

router.get('/', favoriteRoutes.getFavorites)
router.post('/', favoriteRoutes.addFavorite)
router.delete('/:recipeId', favoriteRoutes.removeFavorite)
router.get('/:recipeId/status', favoriteRoutes.getFavoriteStatus)

module.exports = router
