'use strict'

/**
 * routes/mealPlan.js
 * 每周餐单计划路由
 *
 * GET  /                          — 获取当前用户的餐单列表（可筛选 weekStart）
 * POST /                          — 创建新餐单 {weekStart, meals}
 * PUT  /:id                       — 更新餐单 {meals}
 * DELETE /:id                     — 删除餐单
 * POST /:id/generate-shopping-list — 从餐单生成购物清单
 *
 * 所有端点需要 JWT 认证。
 */

const express = require('express')
const { MealPlan, Recipe, ShoppingList } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 安全解析 JSON 字符串
 */
function parseJSON(str, fallback = []) {
  if (!str) return fallback
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/**
 * 解析食谱 ingredients JSON 为数组
 */
function parseIngredients(recipe) {
  if (!recipe || !recipe.ingredients) return []
  // getter 已解析为数组，直接返回；否则 JSON.parse 字符串
  if (Array.isArray(recipe.ingredients)) return recipe.ingredients
  try {
    const parsed = JSON.parse(recipe.ingredients)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 合并食材列表
 */
function mergeIngredients(ingredientLists) {
  const merged = {}
  for (const list of ingredientLists) {
    for (const item of list) {
      const name = (item.name || '').trim()
      if (!name) continue
      const amount = parseFloat(item.amount) || 0
      const unit = item.unit || ''
      if (merged[name]) {
        merged[name].amount += amount
        if (!merged[name].unit && unit) merged[name].unit = unit
      } else {
        merged[name] = { name, amount, unit: unit || '', checked: false }
      }
    }
  }
  return Object.values(merged)
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户的餐单列表
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const where = { userId: req.userId }
    if (req.query.weekStart) {
      where.weekStart = req.query.weekStart
    }
    const plans = await MealPlan.findAll({
      where,
      order: [['weekStart', 'DESC']]
    })
    // 解析 meals 字符串
    const data = plans.map(p => ({
      ...p.toJSON(),
      meals: parseJSON(p.meals)
    }))
    res.json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[mealPlan] GET error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 创建新餐单
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { weekStart, meals } = req.body
    if (!weekStart) {
      return res.status(400).json(resJSON(400, '缺少 weekStart', null))
    }
    if (!Array.isArray(meals)) {
      return res.status(400).json(resJSON(400, 'meals 必须为数组', null))
    }
    const plan = await MealPlan.create({
      userId: req.userId,
      weekStart,
      meals: JSON.stringify(meals)
    })
    res.status(201).json(resJSON(0, 'ok', { ...plan.toJSON(), meals: parseJSON(plan.meals) }))
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json(resJSON(409, '该周已有餐单', null))
    }
    console.error('[mealPlan] POST error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新餐单
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!plan) {
      return res.status(404).json(resJSON(404, '餐单不存在', null))
    }
    const { meals } = req.body
    if (meals !== undefined) {
      if (!Array.isArray(meals)) {
        return res.status(400).json(resJSON(400, 'meals 必须为数组', null))
      }
      plan.meals = JSON.stringify(meals)
    }
    await plan.save()
    res.json(resJSON(0, 'ok', { ...plan.toJSON(), meals: parseJSON(plan.meals) }))
  } catch (err) {
    console.error('[mealPlan] PUT error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除餐单
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!plan) {
      return res.status(404).json(resJSON(404, '餐单不存在', null))
    }
    await plan.destroy()
    res.json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[mealPlan] DELETE error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/generate-shopping-list — 从餐单生成购物清单
// ─────────────────────────────────────────────────────────────────
router.post('/:id/generate-shopping-list', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!plan) {
      return res.status(404).json(resJSON(404, '餐单不存在', null))
    }
    const meals = parseJSON(plan.meals)
    // 收集所有 recipeId
    const recipeIds = [...new Set(meals.map(m => m.recipeId).filter(Boolean))]
    if (recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '餐单中没有食谱', null))
    }
    // 查询食谱
    const recipes = await Recipe.findAll({
      where: { id: recipeIds }
    })
    const ingredientLists = recipes.map(r => parseIngredients(r))
    const merged = mergeIngredients(ingredientLists)
    // 创建购物清单
    const list = await ShoppingList.create({
      userId: req.userId,
      name: `餐单购物清单（${plan.weekStart}）`,
      items: JSON.stringify(merged)
    })
    res.status(201).json(resJSON(0, 'ok', { ...list.toJSON(), items: parseJSON(list.items) }))
  } catch (err) {
    console.error('[mealPlan] generate-shopping-list error:', err.message)
    res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router