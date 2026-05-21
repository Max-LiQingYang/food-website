'use strict'

/**
 * routes/recipes.js
 * 食谱相关路由（公开，无需认证）
 *
 * GET /         — 列表（分页 + 分类筛选）
 * GET /search   — 搜索（标题 + 食材）
 * GET /:id      — 详情
 */

const express = require('express')
const { Recipe } = require('../models')
const { Op } = require('sequelize')

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
  'description', 'category', 'servings', 'difficulty', 'createdAt', 'updatedAt'
]

// ─────────────────────────────────────────────────────────────────
// GET / — 食谱列表（分页 + 分类筛选）
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    const { category } = req.query

    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    const offset = (page - 1) * pageSize
    const where = {}

    if (category) {
      where.category = category
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

module.exports = router
