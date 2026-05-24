'use strict'

/**
 * routes/users.js
 * 用户相关路由（公开）
 *
 * GET /:id/profile  — 用户信息
 * GET /:id/recipes  — 用户发布的食谱
 */

const express = require('express')
const { User, Recipe, Comment, Favorite, Collection, ShoppingList, Activity, Follow } = require('../models')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const LIST_ATTRIBUTES = [
  'id', 'title', 'coverImage', 'author', 'cookTime',
  'description', 'category', 'servings', 'difficulty', 'userId', 'createdAt', 'updatedAt'
]

// ─────────────────────────────────────────────────────────────────
// GET /:id/profile — 用户信息
// ─────────────────────────────────────────────────────────────────
router.get('/:id/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'createdAt']
    })

    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    return res.status(200).json(resJSON(0, 'ok', user))
  } catch (err) {
    console.error('[GET /users/:id/profile] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/recipes — 用户发布的食谱
// ─────────────────────────────────────────────────────────────────
router.get('/:id/recipes', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    // 确认用户存在
    const user = await User.findByPk(req.params.id, {
      attributes: ['id']
    })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where: { userId: req.params.id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      attributes: LIST_ATTRIBUTES
    })

    return res.status(200).json(
      resJSON(0, 'ok', {
        list: rows,
        total: count,
        page,
        pageSize
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/stats — 用户烹饪统计
// ─────────────────────────────────────────────────────────────────
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const [recipeCount, favoriteCount, commentCount, followersCount, followingCount] = await Promise.all([
      Recipe.count({ where: { userId: id } }),
      Favorite.count({ where: { userId: id, isDeleted: false } }),
      Comment.count({ where: { userId: id } }),
      Follow.count({ where: { followingId: id } }),
      Follow.count({ where: { followerId: id } })
    ])

    return res.status(200).json(
      resJSON(0, 'ok', {
        userId: id,
        recipeCount,
        favoriteCount,
        commentCount,
        followersCount,
        followingCount
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/stats] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/favorites — 用户收藏的食谱列表
// ─────────────────────────────────────────────────────────────────
router.get('/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const offset = (page - 1) * pageSize

    const { count, rows } = await Favorite.findAndCountAll({
      where: { userId: id, isDeleted: false },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    // Fetch associated recipes preserving favorite order
    const recipeIds = rows.map(f => f.recipeId)
    const recipes = recipeIds.length > 0
      ? await Recipe.findAll({
          where: { id: { [Op.in]: recipeIds } },
          attributes: LIST_ATTRIBUTES
        })
      : []

    const recipeMap = {}
    for (const r of recipes) {
      recipeMap[r.id] = r
    }
    const list = rows.map(f => recipeMap[f.recipeId]).filter(Boolean)

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        total: count,
        page,
        pageSize
      })
    )
  } catch (err) {
    console.error('[GET /users/:id/favorites] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/activities — 指定用户的活动记录
// ─────────────────────────────────────────────────────────────────
router.get('/:id/activities', async (req, res) => {
  try {
    const { id } = req.params
    let page = Math.max(1, parseInt(req.query.page, 10) || 1)
    let pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Activity.findAndCountAll({
      where: { userId: id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    const list = rows.map(r => {
      const item = r.toJSON()
      try {
        item.extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra
      } catch {
        item.extra = null
      }
      return item
    })

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize })
    )
  } catch (err) {
    console.error('[GET /users/:id/activities] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/activity-heatmap — 用户活跃热力图（近 N 天逐日汇总）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/activity-heatmap', async (req, res) => {
  try {
    const { id } = req.params
    const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30))

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const dateAttr = sequelize.fn('DATE', sequelize.col('createdAt'))

    const [recipeRows, favoriteRows, commentRows] = await Promise.all([
      Recipe.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      }),
      Favorite.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, isDeleted: false, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      }),
      Comment.findAll({
        attributes: [[dateAttr, 'date'], [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where: { userId: id, createdAt: { [Op.gte]: cutoff } },
        group: ['date'],
        raw: true
      })
    ])

    // Merge into daily map
    const dailyMap = {}
    for (const row of recipeRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].recipeCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }
    for (const row of favoriteRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].favoriteCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }
    for (const row of commentRows) {
      const d = row.date
      if (!dailyMap[d]) dailyMap[d] = { date: d, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 }
      dailyMap[d].commentCount = parseInt(row.count, 10)
      dailyMap[d].total += parseInt(row.count, 10)
    }

    // Fill all dates in the range with zeros for empty days
    const daily = []
    const cursor = new Date(cutoff)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10)
      if (dailyMap[key]) {
        daily.push(dailyMap[key])
      } else {
        daily.push({ date: key, recipeCount: 0, favoriteCount: 0, commentCount: 0, total: 0 })
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const maxTotal = daily.reduce((m, d) => Math.max(m, d.total), 0)

    return res.status(200).json(
      resJSON(0, 'ok', { userId: id, days, daily, maxTotal })
    )
  } catch (err) {
    console.error('[GET /users/:id/activity-heatmap] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router