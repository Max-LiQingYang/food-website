'use strict'

const { createActivity } = require('../utils/activity')
const favoriteService = require('../services/favoriteService')
const { Recipe, User, Favorite, Sequelize } = require('../models')
const Op = Sequelize.Op
const { createNotification } = require('../utils/notificationHelper')
const { checkAllAchievements } = require('../utils/achievementChecker')

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
      setImmediate(() => {
        createActivity(userId, 'favorite', recipeId, 'recipe', null)
        Recipe.increment('favoriteCount', { by: 1, where: { id: recipeId } }).catch(err => {
          console.error('[favoriteCount increment error]', err)
        })
        // 通知食谱作者
        Recipe.findByPk(recipeId, { attributes: ['userId', 'title'] }).then(recipe => {
          if (recipe && recipe.userId && recipe.userId !== userId) {
            createNotification({
              userId: recipe.userId,
              type: 'favorite',
              message: '有人收藏了你的食谱「' + recipe.title + '」',
              link: '/recipe/' + recipeId
            }).catch(err => console.error('[fav notif err]', err))
          }
        }).catch(err => console.error('[fav notif lookup err]', err))
        // 成就检查
        checkAllAchievements(userId, ['favorite-10', 'favorite-50']).catch(err => {
          console.error('[fav achievement err]', err)
        })
      })
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
      // 更新食谱收藏计数（不阻塞响应）
      setImmediate(() => {
        Recipe.decrement('favoriteCount', { by: 1, where: { id: recipeId } }).catch(err => {
          console.error('[favoriteCount decrement error]', err)
        })
      })
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
// GET /api/favorites/:recipeId/status — 查询单食谱收藏状态
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
    console.error('[GET /api/favorites/:recipeId/status] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/favorites/:recipeId/count — 获取食谱收藏总数
// ─────────────────────────────────────────────────────────────────
async function getFavoriteCount(req, res) {
  try {
    const { recipeId } = req.params

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    const count = await favoriteService.countFavorites(recipeId)

    return res.status(200).json(
      resJSON(0, 'success', {
        recipeId,
        count
      })
    )
  } catch (err) {
    console.error('[GET /api/favorites/:recipeId/count] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}


// ─────────────────────────────────────────────────────────────────
// POST /api/favorites/batch — 批量收藏/取消收藏
// ─────────────────────────────────────────────────────────────────
async function batchFavorite(req, res) {
  try {
    const userId = req.userId
    const { recipeIds, action } = req.body

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '请提供食谱ID列表', null))
    }
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json(resJSON(400, 'action 必须为 add 或 remove', null))
    }

    if (action === 'add') {
      const result = await favoriteService.batchAddFavorites(userId, recipeIds)
      const activity = Array.isArray(result) ? result : []
      if (activity.length > 0) {
        setImmediate(() => {
          activity.forEach(a => {
            const recipient = a.recipeUserId
            if (recipient && String(recipient) !== String(userId)) {
              createActivity('favorite', userId, a.recipeId, 'Recipe')
              createNotification(recipient, 'favorite', userId, a.recipeId, 'Recipe')
            }
          })
        })
      }
      return res.status(200).json(resJSON(0, 'success', { affected: activity.length }))
    } else {
      await favoriteService.batchRemoveFavorites(userId, recipeIds)
      return res.status(200).json(resJSON(0, 'success', { affected: recipeIds.length }))
    }
  } catch (err) {
    console.error('[POST /api/favorites/batch] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}


// ─────────────────────────────────────────────────────────────────
// POST /api/favorites/batch — 批量收藏/取消收藏
// ─────────────────────────────────────────────────────────────────
async function batchFavorite(req, res) {
  try {
    const userId = req.userId
    const { recipeIds, action } = req.body

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '请提供食谱IDs', null))
    }
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json(resJSON(400, 'action 必须为 add 或 remove', null))
    }

    // Verify recipes exist
    const recipes = await Recipe.findAll({
      where: { id: { [Op.in]: recipeIds } },
      attributes: ['id']
    })
    const validIds = recipes.map(r => r.id)

    let affected = 0
    if (action === 'add') {
      // Batch add favorites (non-paranoid model — no soft delete)
      const existing = await Favorite.findAll({
        where: { userId, recipeId: { [Op.in]: validIds } }
      })
      const existingIds = new Set(existing.map(f => f.recipeId))

      const newIds = validIds.filter(id => !existingIds.has(id))
      if (newIds.length > 0) {
        const records = newIds.map(recipeId => ({ userId, recipeId }))
        await Favorite.bulkCreate(records)
        affected = newIds.length
      }

      // Update favoriteCount for affected recipes
      for (const recipeId of validIds) {
        const count = await Favorite.count({ where: { recipeId } })
        await Recipe.update({ favoriteCount: count }, { where: { id: recipeId } })
      }
    } else {
      // Batch remove favorites
      const deleted = await Favorite.destroy({
        where: { userId, recipeId: { [Op.in]: validIds } }
      })
      affected = deleted

      for (const recipeId of validIds) {
        const count = await Favorite.count({ where: { recipeId } })
        await Recipe.update({ favoriteCount: count }, { where: { id: recipeId } })
      }
    }

    // Clear cache
    if (typeof favoriteService.clearCache === 'function') {
      favoriteService.clearCache()
    }

    return res.status(200).json(resJSON(0, 'success', { affected }))
  } catch (err) {
    console.error('[POST /api/favorites/batch] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
}

module.exports = {
  getFavorites,
  batchFavorite,
  addFavorite,
  removeFavorite,
  getFavoriteStatus,
  getFavoriteCount,
  batchFavorite
}
