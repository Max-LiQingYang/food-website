'use strict'

/**
 * routes/nutrition.js
 * 营养追踪 — 日志记录 + 目标管理 + 统计数据
 *
 * POST   /logs                     — 添加营养记录 (auth)
 * GET    /logs                     — 获取营养记录 (auth, ?date=&mealType=&page=&pageSize=)
 * PUT    /logs/:id                 — 更新营养记录 (auth)
 * DELETE /logs/:id                 — 删除营养记录 (auth)
 * GET    /stats/daily              — 每日统计 (auth, ?date=YYYY-MM-DD)
 * GET    /stats/weekly             — 本周统计 (auth, ?start=&end=)
 * GET    /stats/monthly            — 月度趋势 (auth, ?year=&month=)
 * GET    /goals                    — 获取营养目标 (auth)
 * PUT    /goals                    — 设置/更新营养目标 (auth)
 * GET    /goals/recommended        — 获取推荐值 (auth, ?weight=&height=&age=&gender=&activity=)
 * GET    /suggestions              — 饮食建议 (auth, ?date=)
 */

const express = require('express')
const { NutritionLog, NutritionGoal, Recipe, sequelize } = require('../models')
const { Op, fn, col, literal } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// POST /logs — 添加营养记录 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/logs', auth, async (req, res) => {
  try {
    const { recipeId, date, mealType, servings } = req.body
    if (!recipeId || !date || !mealType) {
      return res.status(400).json(resJSON(400, 'recipeId, date, mealType 为必填', null))
    }

    const validMeals = ['breakfast', 'lunch', 'dinner', 'snack']
    if (!validMeals.includes(mealType)) {
      return res.status(400).json(resJSON(400, 'mealType 必须是 breakfast/lunch/dinner/snack', null))
    }

    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const sv = parseFloat(servings) || 1

    // Parse nutrition from recipe (getter auto-parses)
    const nutrition = recipe.nutrition || {}

    const log = await NutritionLog.create({
      userId: req.userId,
      recipeId,
      date,
      mealType,
      servings: sv,
      calories: (nutrition.calories || 0) * sv,
      protein: (nutrition.protein || 0) * sv,
      fat: (nutrition.fat || 0) * sv,
      carbs: (nutrition.carbs || 0) * sv,
      fiber: (nutrition.fiber || 0) * sv,
      sodium: (nutrition.sodium || 0) * sv,
    })

    return res.status(201).json(resJSON(0, 'ok', log))
  } catch (err) {
    console.error('[POST /nutrition/logs] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /logs — 获取营养记录 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/logs', auth, async (req, res) => {
  try {
    const { date, mealType, page, pageSize: ps } = req.query
    const where = { userId: req.userId }
    if (date) where.date = date
    if (mealType) where.mealType = mealType

    const p = Math.max(1, parseInt(page, 10) || 1)
    const ps2 = Math.min(100, Math.max(1, parseInt(ps, 10) || 20))
    const offset = (p - 1) * ps2

    const { rows, count } = await NutritionLog.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: ps2,
      include: [{
        model: Recipe,
        as: 'recipe',
        attributes: ['id', 'title', 'coverImage', 'category'],
      }],
    })

    return res.status(200).json(resJSON(0, 'ok', { list: rows, total: count, page: p, pageSize: ps2 }))
  } catch (err) {
    console.error('[GET /nutrition/logs] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /logs/:id — 更新营养记录 (auth)
// ─────────────────────────────────────────────────────────────────
router.put('/logs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const log = await NutritionLog.findOne({ where: { id, userId: req.userId } })
    if (!log) {
      return res.status(404).json(resJSON(404, '记录不存在', null))
    }

    const { servings, date, mealType } = req.body
    const update = {}
    if (servings !== undefined) update.servings = servings
    if (date !== undefined) update.date = date
    if (mealType !== undefined) {
      const validMeals = ['breakfast', 'lunch', 'dinner', 'snack']
      if (!validMeals.includes(mealType)) {
        return res.status(400).json(resJSON(400, 'mealType 无效', null))
      }
      update.mealType = mealType
    }

    // Recalc nutrition if servings changed
    if (update.servings !== undefined) {
      const recipe = await Recipe.findByPk(log.recipeId)
      if (recipe) {
        let nutrition = recipe.nutrition || {}
        const sv = parseFloat(update.servings) || 1
        update.calories = (nutrition.calories || 0) * sv
        update.protein = (nutrition.protein || 0) * sv
        update.fat = (nutrition.fat || 0) * sv
        update.carbs = (nutrition.carbs || 0) * sv
        update.fiber = (nutrition.fiber || 0) * sv
        update.sodium = (nutrition.sodium || 0) * sv
      }
    }

    await log.update(update)
    return res.status(200).json(resJSON(0, 'ok', log))
  } catch (err) {
    console.error('[PUT /nutrition/logs/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /logs/:id — 删除营养记录 (auth)
// ─────────────────────────────────────────────────────────────────
router.delete('/logs/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const log = await NutritionLog.findOne({ where: { id, userId: req.userId } })
    if (!log) {
      return res.status(404).json(resJSON(404, '记录不存在', null))
    }
    await log.destroy()
    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /nutrition/logs/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /stats/daily — 每日统计 (auth, ?date=YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────
router.get('/stats/daily', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    const logs = await NutritionLog.findAll({
      where: { userId: req.userId, date },
      include: [{
        model: Recipe,
        as: 'recipe',
        attributes: ['id', 'title', 'coverImage'],
      }],
    })

    // Aggregate by meal type
    const byMeal = { breakfast: [], lunch: [], dinner: [], snack: [] }
    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, count: 0 }

    logs.forEach(log => {
      const d = log.toJSON()
      byMeal[d.mealType] = byMeal[d.mealType] || []
      byMeal[d.mealType].push(d)
      totals.calories += parseFloat(d.calories) || 0
      totals.protein += parseFloat(d.protein) || 0
      totals.fat += parseFloat(d.fat) || 0
      totals.carbs += parseFloat(d.carbs) || 0
      totals.fiber += parseFloat(d.fiber) || 0
      totals.sodium += parseFloat(d.sodium) || 0
      totals.count++
    })

    // Get goals for comparison
    const goal = await NutritionGoal.findOne({ where: { userId: req.userId } })
    const goals = goal ? goal.toJSON() : null

    return res.status(200).json(resJSON(0, 'ok', {
      date,
      totals,
      byMeal,
      goals,
      mealDistribution: Object.entries(byMeal).map(([meal, meals]) => ({
        meal,
        count: meals.length,
        calories: meals.reduce((s, m) => s + (parseFloat(m.calories) || 0), 0),
      })),
    }))
  } catch (err) {
    console.error('[GET /nutrition/stats/daily] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /stats/weekly — 本周统计 (auth, ?start=&end=)
// ─────────────────────────────────────────────────────────────────
router.get('/stats/weekly', auth, async (req, res) => {
  try {
    const end = req.query.end || new Date().toISOString().slice(0, 10)
    const start = req.query.start || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

    const logs = await NutritionLog.findAll({
      where: {
        userId: req.userId,
        date: { [Op.between]: [start, end] },
      },
      order: [['date', 'ASC']],
    })

    // Aggregate by date
    const byDate = {}
    const overall = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, count: 0 }

    logs.forEach(log => {
      const d = log.toJSON()
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, count: 0 }
      byDate[d.date].calories += parseFloat(d.calories) || 0
      byDate[d.date].protein += parseFloat(d.protein) || 0
      byDate[d.date].fat += parseFloat(d.fat) || 0
      byDate[d.date].carbs += parseFloat(d.carbs) || 0
      byDate[d.date].fiber += parseFloat(d.fiber) || 0
      byDate[d.date].count++
      overall.calories += parseFloat(d.calories) || 0
      overall.protein += parseFloat(d.protein) || 0
      overall.fat += parseFloat(d.fat) || 0
      overall.carbs += parseFloat(d.carbs) || 0
      overall.fiber += parseFloat(d.fiber) || 0
      overall.count++
    })

    const goal = await NutritionGoal.findOne({ where: { userId: req.userId } })
    const goals = goal ? goal.toJSON() : null

    return res.status(200).json(resJSON(0, 'ok', {
      start,
      end,
      days: Object.values(byDate),
      overall,
      goals,
      avgDaily: overall.count > 0 ? {
        calories: Math.round(overall.calories / Math.max(Object.keys(byDate).length, 1)),
        protein: Math.round(overall.protein / Math.max(Object.keys(byDate).length, 1)),
        fat: Math.round(overall.fat / Math.max(Object.keys(byDate).length, 1)),
        carbs: Math.round(overall.carbs / Math.max(Object.keys(byDate).length, 1)),
        fiber: Math.round(overall.fiber / Math.max(Object.keys(byDate).length, 1)),
      } : null,
    }))
  } catch (err) {
    console.error('[GET /nutrition/stats/weekly] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /stats/monthly — 月度趋势 (auth, ?year=&month=)
// ─────────────────────────────────────────────────────────────────
router.get('/stats/monthly', auth, async (req, res) => {
  try {
    const now = new Date()
    const year = parseInt(req.query.year, 10) || now.getFullYear()
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0)
    const end = endDate.toISOString().slice(0, 10)

    const logs = await NutritionLog.findAll({
      where: {
        userId: req.userId,
        date: { [Op.between]: [start, end] },
      },
      order: [['date', 'ASC']],
    })

    // Aggregate by date for chart
    const byDate = {}
    logs.forEach(log => {
      const d = log.toJSON()
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, count: 0 }
      byDate[d.date].calories += parseFloat(d.calories) || 0
      byDate[d.date].protein += parseFloat(d.protein) || 0
      byDate[d.date].fat += parseFloat(d.fat) || 0
      byDate[d.date].carbs += parseFloat(d.carbs) || 0
      byDate[d.date].fiber += parseFloat(d.fiber) || 0
      byDate[d.date].count++
    })

    // Meal type distribution for the month
    const mealDist = { breakfast: { count: 0, calories: 0 }, lunch: { count: 0, calories: 0 }, dinner: { count: 0, calories: 0 }, snack: { count: 0, calories: 0 } }
    logs.forEach(log => {
      const d = log.toJSON()
      if (mealDist[d.mealType]) {
        mealDist[d.mealType].count++
        mealDist[d.mealType].calories += parseFloat(d.calories) || 0
      }
    })

    const totalCalories = Object.values(byDate).reduce((s, d) => s + d.calories, 0)
    const activeDays = Object.keys(byDate).length

    return res.status(200).json(resJSON(0, 'ok', {
      year,
      month,
      days: Object.values(byDate),
      mealDistribution: mealDist,
      totalCalories,
      averageDaily: activeDays > 0 ? Math.round(totalCalories / activeDays) : 0,
      activeDays,
      totalLogs: logs.length,
    }))
  } catch (err) {
    console.error('[GET /nutrition/stats/monthly] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /goals — 获取营养目标 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/goals', auth, async (req, res) => {
  try {
    let goal = await NutritionGoal.findOne({ where: { userId: req.userId } })
    if (!goal) {
      // Auto-create with defaults
      goal = await NutritionGoal.create({ userId: req.userId })
    }
    return res.status(200).json(resJSON(0, 'ok', goal))
  } catch (err) {
    console.error('[GET /nutrition/goals] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /goals — 设置/更新营养目标 (auth)
// ─────────────────────────────────────────────────────────────────
router.put('/goals', auth, async (req, res) => {
  try {
    const { calories, protein, fat, carbs, fiber } = req.body

    const [goal] = await NutritionGoal.findOrCreate({
      where: { userId: req.userId },
      defaults: { userId: req.userId },
    })

    const update = {}
    if (calories !== undefined) update.calories = calories
    if (protein !== undefined) update.protein = protein
    if (fat !== undefined) update.fat = fat
    if (carbs !== undefined) update.carbs = carbs
    if (fiber !== undefined) update.fiber = fiber

    if (Object.keys(update).length > 0) {
      await goal.update(update)
    }

    return res.status(200).json(resJSON(0, 'ok', goal))
  } catch (err) {
    console.error('[PUT /nutrition/goals] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /goals/recommended — 获取推荐值 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/goals/recommended', auth, async (req, res) => {
  try {
    const { weight, height, age, gender, activity } = req.query
    const profile = {
      weight: parseFloat(weight) || 60,
      height: parseFloat(height) || 165,
      age: parseInt(age, 10) || 30,
      gender: gender || 'female',
      activity: activity || 'moderate',
    }
    const recommended = NutritionGoal.getRecommended(profile)
    return res.status(200).json(resJSON(0, 'ok', recommended))
  } catch (err) {
    console.error('[GET /nutrition/goals/recommended] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /suggestions — 饮食建议 (auth, ?date=)
// ─────────────────────────────────────────────────────────────────
router.get('/suggestions', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10)

    // Get today's logs
    const logs = await NutritionLog.findAll({
      where: { userId: req.userId, date },
    })

    const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
    logs.forEach(l => {
      totals.calories += parseFloat(l.calories) || 0
      totals.protein += parseFloat(l.protein) || 0
      totals.fat += parseFloat(l.fat) || 0
      totals.carbs += parseFloat(l.carbs) || 0
      totals.fiber += parseFloat(l.fiber) || 0
    })

    const goal = await NutritionGoal.findOne({ where: { userId: req.userId } })
    const goals = goal ? goal.toJSON() : { calories: 2000, protein: 60, fat: 65, carbs: 250, fiber: 25 }

    const suggestions = []

    if (totals.calories < goals.calories * 0.5) {
      suggestions.push({ type: 'calorie', severity: 'warning', message: '今日热量摄入不足目标的50%，建议增加一餐健康加餐' })
    } else if (totals.calories > goals.calories * 1.2) {
      suggestions.push({ type: 'calorie', severity: 'info', message: '今日热量已超目标，建议选择低卡食材' })
    }

    if (totals.protein < goals.protein * 0.6) {
      suggestions.push({ type: 'protein', severity: 'warning', message: '蛋白质摄入不足，推荐食用鸡蛋、鸡胸肉或豆制品' })
    }

    if (totals.fiber < goals.fiber * 0.5) {
      suggestions.push({ type: 'fiber', severity: 'warning', message: '膳食纤维摄入偏少，建议增加蔬菜和全谷物' })
    }

    if (totals.fat > goals.fat * 1.3) {
      suggestions.push({ type: 'fat', severity: 'info', message: '脂肪摄入偏高，注意控制油脂类食材的使用' })
    }

    if (suggestions.length === 0) {
      suggestions.push({ type: 'good', severity: 'success', message: '今日营养摄入均衡，继续保持！' })
    }

    return res.status(200).json(resJSON(0, 'ok', { suggestions, totals, goals }))
  } catch (err) {
    console.error('[GET /nutrition/suggestions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router