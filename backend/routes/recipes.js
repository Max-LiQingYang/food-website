'use strict'

/**
 * routes/recipes.js
 * 食谱相关路由
 *
 * GET  /           — 列表（分页 + 分类筛选，公开）
 * GET  /search     — 搜索（标题 + 食材，公开）
 * GET  /:id        — 详情（公开）
 * POST /           — 创建（需认证）
 * PUT  /:id        — 编辑（需认证 + 作者）
 * DEL  /:id        — 删除（需认证 + 作者）
 */

const express = require('express')
const { Recipe } = require('../models')
const { Op } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

/**
 * 通用响应封装
 * @param {number} code
 * @param {string} message
 * @param {any} data
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 列表查询的公共属性（不含 ingredients/steps，节省带宽）
 */
const LIST_ATTRIBUTES = [
  'id', 'title', 'coverImage', 'author', 'cookTime',
  'description', 'category', 'servings', 'difficulty', 'userId', 'createdAt', 'updatedAt'
]

// ─────────────────────────────────────────────────────────────────
// GET / — 食谱列表（分页 + 分类筛选）
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const { category, userId } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize
    const where = {}

    if (category) {
      where.category = category
    }
    if (userId) {
      where.userId = userId
    }

    const { count, rows } = await Recipe.findAndCountAll({
      where,
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
    console.error('[GET /recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /search — 搜索食谱（标题 + 食材）
// ─────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const { q } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize

    if (!q || q.trim().length === 0) {
      return res.status(400).json(resJSON(400, '搜索关键词不能为空', null))
    }

    const keyword = `%${q.trim()}%`

    const { count, rows } = await Recipe.findAndCountAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: keyword } },
          { ingredients: { [Op.like]: keyword } }
        ]
      },
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
    console.error('[GET /recipes/search] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id — 食谱详情（含 ingredients 和 steps 解析为 JSON）
// ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    const data = recipe.toJSON()

    // 解析 JSON 字段
    if (data.ingredients) {
      try {
        data.ingredients = JSON.parse(data.ingredients)
      } catch {
        data.ingredients = []
      }
    } else {
      data.ingredients = []
    }

    if (data.steps) {
      try {
        data.steps = JSON.parse(data.steps)
      } catch {
        data.steps = []
      }
    } else {
      data.steps = []
    }

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[GET /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST / — 创建食谱（需认证）
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, ingredients, steps, coverImage, servings, difficulty, cookTime } = req.body

    if (!title || title.trim().length === 0) {
      return res.status(400).json(resJSON(400, '食谱标题不能为空', null))
    }

    // 从 User 模型获取用户显示名
    const { User } = require('../models')
    const user = await User.findByPk(req.userId)

    const recipe = await Recipe.create({
      title: title.trim(),
      description: description || null,
      category: category || null,
      ingredients: ingredients ? JSON.stringify(ingredients) : null,
      steps: steps ? JSON.stringify(steps) : null,
      coverImage: coverImage || null,
      servings: servings != null ? parseInt(servings, 10) : null,
      difficulty: difficulty || null,
      cookTime: cookTime != null ? parseInt(cookTime, 10) : null,
      author: user ? (user.nickname || user.username) : '未知用户',
      userId: req.userId
    })

    return res.status(201).json(resJSON(0, 'ok', recipe))
  } catch (err) {
    console.error('[POST /recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 编辑食谱（需认证 + 作者本人）
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    if (recipe.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权编辑此食谱', null))
    }

    const { title, description, category, ingredients, steps, coverImage, servings, difficulty, cookTime } = req.body

    const updateData = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (ingredients !== undefined) updateData.ingredients = JSON.stringify(ingredients)
    if (steps !== undefined) updateData.steps = JSON.stringify(steps)
    if (coverImage !== undefined) updateData.coverImage = coverImage
    if (servings !== undefined) updateData.servings = parseInt(servings, 10)
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (cookTime !== undefined) updateData.cookTime = parseInt(cookTime, 10)
    updateData.updatedAt = new Date()

    await Recipe.update(updateData, { where: { id } })

    const updated = await Recipe.findByPk(id)
    const data = updated.toJSON()
    if (data.ingredients) {
      try { data.ingredients = JSON.parse(data.ingredients) } catch { data.ingredients = [] }
    }
    if (data.steps) {
      try { data.steps = JSON.parse(data.steps) } catch { data.steps = [] }
    }

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[PUT /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除食谱（需认证 + 作者本人）
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const recipe = await Recipe.findByPk(id)

    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    if (recipe.userId !== req.userId) {
      return res.status(403).json(resJSON(403, '无权删除此食谱', null))
    }

    await Recipe.destroy({ where: { id } })

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /recipes/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
module.exports.auth = auth