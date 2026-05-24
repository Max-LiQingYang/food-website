'use strict'

/**
 * routes/pantry.js
 * 食材库存管理
 *
 * GET    /                          — 获取用户库存列表 (auth, 支持 ?category=&expiring=7&search=)
 * POST   /                          — 添加库存项 (auth)
 * PUT    /:id                       — 更新库存项 (auth)
 * DELETE /:id                       — 删除库存项 (auth)
 * GET    /expiring                  — 即将过期食材 (auth, ?days=3)
 * GET    /expired                   — 已过期食材 (auth)
 * GET    /suggestions               — 基于库存的食谱推荐 (auth)
 * POST   /quick-add                 — 批量快速添加 (auth, [{name, quantity, unit, expiryDate}])
 * DELETE /:id/batch                 — 批量删除 (auth, {ids: [...]})
 */

const express = require('express')
const { PantryItem, Recipe, sequelize } = require('../models')
const { Op } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取用户库存 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { category, expiring, search, page, pageSize: ps, sortBy, sortOrder } = req.query
    const where = { userId: req.userId }

    if (category && category !== '全部') where.category = category
    if (search) where.name = { [Op.like]: `%${search}%` }

    // Expiring soon filter
    if (expiring) {
      const days = parseInt(expiring, 10) || 3
      const now = new Date()
      const future = new Date(now.getTime() + days * 86400000)
      where.expiryDate = {
        [Op.between]: [now.toISOString().slice(0, 10), future.toISOString().slice(0, 10)],
      }
    }

    const p = Math.max(1, parseInt(page, 10) || 1)
    const ps2 = Math.min(100, Math.max(1, parseInt(ps, 10) || 50))
    const offset = (p - 1) * ps2

    const sortField = ['name', 'category', 'expiryDate', 'addedAt', 'updatedAt'].includes(sortBy) ? sortBy : 'updatedAt'
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const { rows, count } = await PantryItem.findAndCountAll({
      where,
      order: [[sortField, order]],
      offset,
      limit: ps2,
    })

    return res.status(200).json(resJSON(0, 'ok', { list: rows, total: count, page: p, pageSize: ps2 }))
  } catch (err) {
    console.error('[GET /pantry] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 添加库存项 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, quantity, unit, category, expiryDate, notes } = req.body
    if (!name || String(name).trim().length === 0) {
      return res.status(400).json(resJSON(400, '食材名称不能为空', null))
    }

    const finalName = String(name).trim()
    const item = await PantryItem.create({
      userId: req.userId,
      name: finalName,
      quantity: quantity !== undefined ? quantity : 1,
      unit: unit || '个',
      category: category || PantryItem.autoCategorize(finalName),
      expiryDate: expiryDate || null,
      notes: notes || null,
    })

    return res.status(201).json(resJSON(0, 'ok', item))
  } catch (err) {
    console.error('[POST /pantry] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /quick-add — 批量快速添加 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/quick-add', auth, async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json(resJSON(400, 'items 必须是非空数组', null))
    }

    const created = await PantryItem.bulkCreate(items.map(it => ({
      userId: req.userId,
      name: String(it.name).trim(),
      quantity: it.quantity || 1,
      unit: it.unit || '个',
      category: it.category || PantryItem.autoCategorize(it.name || ''),
      expiryDate: it.expiryDate || null,
      notes: it.notes || null,
    })))

    return res.status(201).json(resJSON(0, 'ok', { list: created, count: created.length }))
  } catch (err) {
    console.error('[POST /pantry/quick-add] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /expiring — 即将过期 (auth, ?days=3)
// ─────────────────────────────────────────────────────────────────
router.get('/expiring', auth, async (req, res) => {
  try {
    const days = Math.max(1, parseInt(req.query.days, 10) || 3)
    const now = new Date()
    const future = new Date(now.getTime() + days * 86400000)
    const todayStr = now.toISOString().slice(0, 10)
    const futureStr = future.toISOString().slice(0, 10)

    const items = await PantryItem.findAll({
      where: {
        userId: req.userId,
        expiryDate: { [Op.between]: [todayStr, futureStr] },
      },
      order: [['expiryDate', 'ASC']],
    })

    return res.status(200).json(resJSON(0, 'ok', { list: items, count: items.length }))
  } catch (err) {
    console.error('[GET /pantry/expiring] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /expired — 已过期 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/expired', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const items = await PantryItem.findAll({
      where: {
        userId: req.userId,
        expiryDate: { [Op.lt]: today },
      },
      order: [['expiryDate', 'ASC']],
    })

    return res.status(200).json(resJSON(0, 'ok', { list: items, count: items.length }))
  } catch (err) {
    console.error('[GET /pantry/expired] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /suggestions — 基于库存的食谱推荐 (auth)
// ─────────────────────────────────────────────────────────────────
router.get('/suggestions', auth, async (req, res) => {
  try {
    // Get all user's pantry items with their names
    const items = await PantryItem.findAll({
      where: { userId: req.userId },
      attributes: ['name'],
    })
    const ingredientNames = items.map(i => i.name.toLowerCase())
    if (ingredientNames.length === 0) {
      return res.status(200).json(resJSON(0, 'ok', { list: [], total: 0, message: '库存为空，去添加一些食材吧' }))
    }

    // Search recipes whose ingredients overlap with pantry items
    const allRecipes = await Recipe.findAll({
      attributes: ['id', 'title', 'coverImage', 'description', 'category', 'cookTime', 'difficulty', 'servings', 'ingredients', 'favoriteCount', 'userId', 'createdAt'],
      limit: 200,
    })

    const scored = allRecipes.map(r => {
      let recipeIngredients = []
      try {
        const ings = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients
        recipeIngredients = Array.isArray(ings) ? ings : []
      } catch { recipeIngredients = [] }

      const matched = recipeIngredients.filter(ing => {
        const ingLower = (typeof ing === 'string' ? ing : (ing.name || '')).toLowerCase()
        return ingredientNames.some(pantry => ingLower.includes(pantry) || pantry.includes(ingLower))
      })

      const missing = recipeIngredients.length - matched.length
      const matchRatio = recipeIngredients.length > 0 ? matched.length / recipeIngredients.length : 0

      return {
        recipe: { id: r.id, title: r.title, coverImage: r.coverImage, description: r.description, category: r.category, cookTime: r.cookTime, difficulty: r.difficulty, servings: r.servings, favoriteCount: r.favoriteCount },
        matchCount: matched.length,
        totalIngredients: recipeIngredients.length,
        matchRatio: Math.round(matchRatio * 100),
        missingCount: missing,
        matchedIngredients: matched.slice(0, 5),
      }
    })

    // Sort by match ratio desc, then by match count desc
    scored.sort((a, b) => b.matchRatio - a.matchRatio || b.matchCount - a.matchCount)

    const results = scored.filter(s => s.matchCount > 0).slice(0, 20)
    const noMatchMessage = results.length === 0 ? '没有找到可用库存食材的食谱' : undefined

    return res.status(200).json(resJSON(0, 'ok', { list: results, total: results.length, message: noMatchMessage }))
  } catch (err) {
    console.error('[GET /pantry/suggestions] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新库存项 (auth)
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const item = await PantryItem.findOne({ where: { id, userId: req.userId } })
    if (!item) {
      return res.status(404).json(resJSON(404, '食材不存在', null))
    }

    const { name, quantity, unit, category, expiryDate, notes } = req.body
    const update = {}
    if (name !== undefined) update.name = String(name).trim()
    if (quantity !== undefined) update.quantity = quantity
    if (unit !== undefined) update.unit = unit
    if (category !== undefined) update.category = category
    if (expiryDate !== undefined) update.expiryDate = expiryDate
    if (notes !== undefined) update.notes = notes

    // Auto-categorize if name changed and no explicit category
    if (update.name && !update.category) {
      update.category = PantryItem.autoCategorize(update.name)
    }

    await item.update(update)
    return res.status(200).json(resJSON(0, 'ok', item))
  } catch (err) {
    console.error('[PUT /pantry/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除库存项 (auth)
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const item = await PantryItem.findOne({ where: { id, userId: req.userId } })
    if (!item) {
      return res.status(404).json(resJSON(404, '食材不存在', null))
    }

    await item.destroy()
    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /pantry/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /batch-delete — 批量删除 (auth)
// ─────────────────────────────────────────────────────────────────
router.post('/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(resJSON(400, 'ids 必须是数组', null))
    }

    const deleted = await PantryItem.destroy({
      where: { id: ids, userId: req.userId },
    })

    return res.status(200).json(resJSON(0, 'ok', { deleted }))
  } catch (err) {
    console.error('[POST /pantry/batch-delete] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router