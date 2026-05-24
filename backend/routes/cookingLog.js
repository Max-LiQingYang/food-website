'use strict'

/**
 * routes/cookingLog.js
 * 用户烹饪日志路由
 *
 * GET  /        — 获取当前用户的烹饪日志列表（分页，可筛选 recipeId）
 * POST /        — 创建烹饪日志
 * PUT  /:id     — 更新烹饪日志（仅所有者）
 * DELETE /:id   — 删除烹饪日志（仅所有者）
 * GET  /stats   — 烹饪统计
 *
 * 所有端点需要 JWT 认证。
 */

const express = require('express')
const { CookingLog, Recipe } = require('../models')
const { Op, fn, col, literal } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取烹饪日志列表（分页）
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const where = { userId: req.userId }
    if (req.query.recipeId) {
      where.recipeId = req.query.recipeId
    }
    const { count, rows } = await CookingLog.findAndCountAll({
      where,
      order: [['cookedAt', 'DESC'], ['createdAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize
    })
    res.json(resJSON(0, 'ok', {
      list: rows,
      total: count,
      page,
      pageSize
    }))
  } catch (err) {
    console.error('[cookingLog] GET error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 创建烹饪日志
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { recipeId, cookedAt, rating, notes, duration, photoUrl } = req.body
    if (!recipeId) {
      return res.status(400).json(resJSON(400, '缺少 recipeId', null))
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(resJSON(400, 'rating 需在 1-5 之间', null))
    }
    // 从 Recipe 获取标题和分类
    const recipe = await Recipe.findByPk(recipeId, {
      attributes: ['title', 'category']
    })
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }
    const log = await CookingLog.create({
      userId: req.userId,
      recipeId,
      recipeTitle: recipe.title,
      recipeCategory: recipe.category || null,
      cookedAt: cookedAt || new Date().toISOString().slice(0, 10),
      rating,
      notes: notes || null,
      duration: duration || null,
      photoUrl: photoUrl || null
    })
    res.status(201).json(resJSON(0, 'ok', log))
  } catch (err) {
    console.error('[cookingLog] POST error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新烹饪日志
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const log = await CookingLog.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!log) {
      return res.status(404).json(resJSON(404, '日志不存在', null))
    }
    const updatableFields = ['rating', 'notes', 'duration', 'photoUrl', 'cookedAt']
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        if (field === 'rating' && (req.body.rating < 1 || req.body.rating > 5)) {
          return res.status(400).json(resJSON(400, 'rating 需在 1-5 之间', null))
        }
        log[field] = req.body[field]
      }
    }
    await log.save()
    res.json(resJSON(0, 'ok', log))
  } catch (err) {
    console.error('[cookingLog] PUT error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除烹饪日志
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const log = await CookingLog.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!log) {
      return res.status(404).json(resJSON(404, '日志不存在', null))
    }
    await log.destroy()
    res.json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[cookingLog] DELETE error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /stats — 烹饪统计
// ─────────────────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId

    // 总烹饪次数
    const totalCooked = await CookingLog.count({ where: { userId } })

    // 本月烹饪次数
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
    const thisMonthCount = await CookingLog.count({
      where: {
        userId,
        cookedAt: { [Op.between]: [monthStart, monthEnd] }
      }
    })

    // 按分类统计
    const allLogs = await CookingLog.findAll({
      where: { userId },
      attributes: ['recipeCategory'],
      raw: true
    })
    const byCategory = {}
    for (const log of allLogs) {
      const cat = log.recipeCategory || 'other'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }

    // 按月统计（最近 12 个月）
    const byMonth = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.toISOString().slice(0, 10)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const count = await CookingLog.count({
        where: { userId, cookedAt: { [Op.between]: [start, end] } }
      })
      byMonth.push({
        month: start.slice(0, 7), // YYYY-MM
        count
      })
    }

    // 平均评分
    const ratingResult = await CookingLog.findAll({
      where: { userId },
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
      raw: true
    })
    const averageRating = ratingResult[0] && ratingResult[0].avgRating
      ? Math.round(parseFloat(ratingResult[0].avgRating) * 10) / 10
      : 0

    res.json(resJSON(0, 'ok', {
      totalCooked,
      thisMonthCount,
      byCategory,
      byMonth,
      averageRating
    }))
  } catch (err) {
    console.error('[cookingLog] STATS error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router