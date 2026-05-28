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
const { checkAllAchievements } = require('../utils/achievementChecker')

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

    // 烹饪成就检查（不阻塞响应）
    setImmediate(() => {
      checkAllAchievements(req.userId, ['first-cook', 'cook-10', 'cook-50', 'cook-100']).catch(err => {
        console.error('[cooking achievement err]', err)
      })
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
// GET /stats — 烹饪统计（增强版）
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
      where: { userId, cookedAt: { [Op.between]: [monthStart, monthEnd] } }
    })

    // 按分类统计
    const allLogs = await CookingLog.findAll({
      where: { userId },
      attributes: ['recipeCategory'],
      raw: true
    })
    const byCategory = {}
    for (const log of allLogs) {
      const cat = log.recipeCategory || '其他'
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
      byMonth.push({ month: start.slice(0, 7), count })
    }

    // 平均评分
    const ratingResult = await CookingLog.findAll({
      where: { userId },
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
      raw: true
    })
    const averageRating = ratingResult[0] && ratingResult[0].avgRating
      ? Math.round(parseFloat(ratingResult[0].avgRating) * 10) / 10 : 0

    // ── 最常做菜 TOP10 ──
    const topRecipes = await CookingLog.findAll({
      where: { userId },
      attributes: [
        'recipeId', 'recipeTitle', 'recipeCategory',
        [fn('COUNT', col('id')), 'cookCount'],
        [fn('AVG', col('rating')), 'avgRating'],
      ],
      group: ['recipeId', 'recipeTitle', 'recipeCategory'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 10,
      raw: true,
    })

    // ── 食材使用频率 ──
    // 从关联的 Recipe 中提取 ingredients 字段
    const cookedRecipes = await CookingLog.findAll({
      where: { userId },
      attributes: ['recipeId'],
      group: ['recipeId'],
      raw: true,
    })
    const recipeIds = cookedRecipes.map(r => r.recipeId).filter(Boolean)

    const ingredientFreq = {}
    if (recipeIds.length > 0) {
      // 分批查询避免 IN 子句过大
      const batchSize = 50
      for (let i = 0; i < recipeIds.length; i += batchSize) {
        const batch = recipeIds.slice(i, i + batchSize)
        const recipes = await Recipe.findAll({
          where: { id: batch },
          attributes: ['ingredients'],
          raw: true,
        })
        for (const r of recipes) {
          let ings = []
          try { ings = JSON.parse(r.ingredients || '[]') } catch { ings = [] }
          for (const ing of ings) {
            const name = (typeof ing === 'string' ? ing : (ing.name || '')).trim()
            if (name) ingredientFreq[name] = (ingredientFreq[name] || 0) + 1
          }
        }
      }
    }
    const topIngredients = Object.entries(ingredientFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)

    // ── 口味偏好雷达图 ──
    // 基于分类推断口味偏好
    const flavorMap = {
      '中餐': { spicy: 0.2, savory: 0.4, sweet: 0.1, sour: 0.1, light: 0.2 },
      '西餐': { spicy: 0.1, savory: 0.3, sweet: 0.2, sour: 0.1, light: 0.3 },
      '甜品': { spicy: 0.0, savory: 0.0, sweet: 0.7, sour: 0.1, light: 0.2 },
      '日料': { spicy: 0.1, savory: 0.3, sweet: 0.1, sour: 0.1, light: 0.4 },
      '韩餐': { spicy: 0.3, savory: 0.3, sweet: 0.1, sour: 0.1, light: 0.2 },
      '泰餐': { spicy: 0.3, savory: 0.2, sweet: 0.2, sour: 0.2, light: 0.1 },
    }
    const flavorScores = { spicy: 0, savory: 0, sweet: 0, sour: 0, light: 0 }
    let totalForFlavor = 0
    for (const log of allLogs) {
      const cat = log.recipeCategory || '其他'
      const profile = flavorMap[cat]
      if (profile) {
        for (const key of Object.keys(flavorScores)) {
          flavorScores[key] += profile[key]
        }
        totalForFlavor++
      }
    }
    const flavorProfile = {}
    for (const key of Object.keys(flavorScores)) {
      flavorProfile[key] = totalForFlavor > 0
        ? Math.round((flavorScores[key] / totalForFlavor) * 100)
        : 0
    }

    // ── 月度烹饪时长统计 ──
    const durationByMonth = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.toISOString().slice(0, 10)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
      const result = await CookingLog.findAll({
        where: { userId, cookedAt: { [Op.between]: [start, end] } },
        attributes: [
          [fn('SUM', col('duration')), 'totalDuration'],
          [fn('COUNT', col('id')), 'count'],
        ],
        raw: true,
      })
      durationByMonth.push({
        month: start.slice(0, 7),
        totalMinutes: Math.round(result[0]?.totalDuration || 0),
        count: result[0]?.count || 0,
      })
    }

    // ── 烹饪频率（每周） ──
    let weeklyFrequency = 0
    if (totalCooked > 0) {
      // 最早和最晚的烹饪记录
      const [earliest] = await CookingLog.findAll({
        where: { userId },
        order: [['cookedAt', 'ASC']],
        limit: 1,
        attributes: ['cookedAt'],
        raw: true,
      })
      const [latest] = await CookingLog.findAll({
        where: { userId },
        order: [['cookedAt', 'DESC']],
        limit: 1,
        attributes: ['cookedAt'],
        raw: true,
      })
      if (earliest && latest && earliest.cookedAt !== latest.cookedAt) {
        const diffMs = new Date(latest.cookedAt).getTime() - new Date(earliest.cookedAt).getTime()
        const diffWeeks = Math.max(1, diffMs / (7 * 24 * 60 * 60 * 1000))
        weeklyFrequency = Math.round((totalCooked / diffWeeks) * 10) / 10
      }
    }

    res.json(resJSON(0, 'ok', {
      totalCooked,
      thisMonthCount,
      byCategory,
      byMonth,
      averageRating,
      topRecipes,
      topIngredients,
      flavorProfile,
      durationByMonth,
      weeklyFrequency,
    }))
  } catch (err) {
    console.error('[cookingLog] STATS error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})


// ─────────────────────────────────────────────────────────────────
// GET /detail/:id — 烹饪日志详情
// ─────────────────────────────────────────────────────────────────
router.get('/detail/:id', auth, async (req, res) => {
  try {
    const log = await CookingLog.findByPk(req.params.id, {
      include: [{
        model: Recipe,
        attributes: ['id', 'title', 'coverImage', 'category', 'difficulty', 'cookTime', 'servings']
      }]
    })
    if (!log) return res.status(404).json(resJSON(404, '日志不存在', null))

    return res.status(200).json(resJSON(0, 'success', log))
  } catch (err) {
    console.error('[GET /cooking-logs/detail/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /search — 搜索和筛选烹饪日志
// ─────────────────────────────────────────────────────────────────
router.get('/search', auth, async (req, res) => {
  try {
    const userId = req.userId
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const { q, startDate, endDate, minRating, maxRating } = req.query

    const where = { userId }

    // Date range filter
    if (startDate || endDate) {
      where.cookedAt = {}
      if (startDate) where.cookedAt[Op.gte] = new Date(startDate)
      if (endDate) where.cookedAt[Op.lte] = new Date(endDate + 'T23:59:59')
    }

    // Rating filter
    if (minRating || maxRating) {
      where.rating = {}
      if (minRating) where.rating[Op.gte] = parseFloat(minRating)
      if (maxRating) where.rating[Op.lte] = parseFloat(maxRating)
    }

    const include = [{
      model: Recipe,
      attributes: ['id', 'title', 'coverImage', 'category'],
      ...(q ? { where: { title: { [Op.like]: `%${q}%` } } } : {})
    }]

    const { rows, count } = await CookingLog.findAndCountAll({
      where,
      include,
      order: [['cookedAt', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: pageSize
    })

    return res.status(200).json(resJSON(0, 'success', {
      logs: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    }))
  } catch (err) {
    console.error('[GET /cooking-logs/search] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /stats/enhanced — 增强烹饪统计
// ─────────────────────────────────────────────────────────────────
router.get('/stats/enhanced', auth, async (req, res) => {
  try {
    const userId = req.userId

    // Weekly cooking count (last 7 days)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    const weeklyCount = await CookingLog.count({
      where: { userId, cookedAt: { [Op.gte]: weekStart } }
    })

    // Monthly trend (last 30 days, grouped by day)
    const monthStart = new Date()
    monthStart.setDate(monthStart.getDate() - 30)
    const monthlyLogs = await CookingLog.findAll({
      where: { userId, cookedAt: { [Op.gte]: monthStart } },
      attributes: ['cookedAt', 'rating', 'recipeId'],
      order: [['cookedAt', 'ASC']]
    })

    // Build daily trend
    const dailyMap = {}
    for (const log of monthlyLogs) {
      const day = log.cookedAt ? new Date(log.cookedAt).toISOString().slice(0, 10) : 'unknown'
      if (!dailyMap[day]) dailyMap[day] = { count: 0, totalRating: 0, ratingCount: 0 }
      dailyMap[day].count++
      if (log.rating) {
        dailyMap[day].totalRating += log.rating
        dailyMap[day].ratingCount++
      }
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgRating: data.ratingCount > 0 ? Math.round(data.totalRating / data.ratingCount * 10) / 10 : 0
      }))

    // Most cooked recipes
    const recipeCountMap = {}
    for (const log of monthlyLogs) {
      recipeCountMap[log.recipeId] = (recipeCountMap[log.recipeId] || 0) + 1
    }
    const recipeIds = Object.keys(recipeCountMap).map(Number).filter(Boolean)
    const recipes = recipeIds.length > 0
      ? await Recipe.findAll({
          where: { id: { [Op.in]: recipeIds } },
          attributes: ['id', 'title', 'coverImage']
        })
      : []
    const recipeMap = {}
    recipes.forEach(r => { recipeMap[r.id] = r })

    const mostCooked = Object.entries(recipeCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        recipeId: parseInt(id),
        title: recipeMap[parseInt(id)]?.title || '',
        coverImage: recipeMap[parseInt(id)]?.coverImage || '',
        count
      }))

    // Achievement progress
    const totalCooking = await CookingLog.count({ where: { userId } })
    // Use raw query for distinct count
    const [result] = await require('../models').sequelize.query(
      'SELECT COUNT(DISTINCT recipeId) as cnt FROM cooking_logs WHERE userId = ?',
      { replacements: [userId], type: require('sequelize').QueryTypes.SELECT }
    )
    const totalRecipesCooked = result?.cnt || 0

    return res.status(200).json(resJSON(0, 'success', {
      weeklyCount,
      dailyTrend,
      mostCooked,
      achievement: {
        totalCooking,
        totalRecipesCooked: totalRecipesCooked.length,
        currentStreak: weeklyCount, // Simple: last 7 days count
        totalRatings: await CookingLog.count({ where: { userId, rating: { [Op.ne]: null } } })
      }
    }))
  } catch (err) {
    console.error('[GET /cooking-logs/stats/enhanced] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router