'use strict'

const favoriteService = require('../services/favoriteService')

/**
 * 通用响应封装
 * @param {number} code - 业务码，0=成功
 * @param {string} message
 * @param {any} data
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites — 获取收藏列表（分页）
// ─────────────────────────────────────────────────────────────────
async function getFavorites(req, res) {
  try {
    const userId = req.userId
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const result = await favoriteService.getFavoritesByUser(userId, page, pageSize)

    return res.status(200).json(resJSON(0, 'success', result))
  } catch (err) {
    console.error('[GET /api/favorites] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/favorites — 添加收藏
// ─────────────────────────────────────────────────────────────────
async function addFavorite(req, res) {
  try {
    const userId = req.userId
    const { recipeId } = req.body

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    // UUID v4 简单校验（32位十六进制，可选连字符）
    const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
    if (!uuidRegex.test(recipeId)) {
      return res.status(400).json(resJSON(400, 'recipeId 格式无效', null))
    }

    const result = await favoriteService.addFavorite(userId, recipeId)

    if (result.isNew) {
      // 新增，返回 201
      return res.status(201).json(resJSON(0, '收藏成功', result.data))
    } else {
      // 已存在，幂等返回 200
      return res.status(200).json(resJSON(0, '已收藏', null))
    }
  } catch (err) {
    console.error('[POST /api/favorites] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/favorites/:recipeId — 取消收藏
// ─────────────────────────────────────────────────────────────────
async function removeFavorite(req, res) {
  try {
    const userId = req.userId
    const { recipeId } = req.params

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    const result = await favoriteService.removeFavorite(userId, recipeId)

    if (result.deleted) {
      return res.status(200).json(resJSON(0, '取消收藏成功', null))
    } else {
      // 未收藏，幂等返回 200
      return res.status(200).json(resJSON(0, '未收藏，无需取消', null))
    }
  } catch (err) {
    console.error('[DELETE /api/favorites/:recipeId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites/status/:recipeId — 查询单食谱收藏状态
// ─────────────────────────────────────────────────────────────────
async function getFavoriteStatus(req, res) {
  try {
    const userId = req.userId
    const { recipeId } = req.params

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    const result = await favoriteService.getFavoriteStatus(userId, recipeId)

    return res.status(200).json(
      resJSON(0, 'success', {
        isFavorited: result.isFavorited,
        favoriteId: result.favoriteId || null
      })
    )
  } catch (err) {
    console.error('[GET /api/favorites/status/:recipeId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  getFavoriteStatus
}
