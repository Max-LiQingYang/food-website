'use strict'

/**
 * routes/collections.js
 * 收藏夹 CRUD 路由
 *
 * POST   /                     — 创建收藏夹 {name, description?}
 * GET    /                     — 获取当前用户所有收藏夹（含 recipes count）
 * GET    /:id                  — 单个收藏夹详情（含分页食谱列表）
 * PUT    /:id                  — 更新收藏夹
 * DELETE /:id                  — 删除收藏夹（级联删除关联）
 * POST   /:id/recipes          — 添加食谱 {recipeId}（幂等）
 * DELETE /:id/recipes/:recipeId — 移除食谱
 *
 * 所有端点需要 JWT 认证；只能操作自己的收藏夹。
 */

const express = require('express')
const { Collection, CollectionRecipe, Recipe } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

/**
 * 通用响应封装
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// POST / — 创建收藏夹
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json(resJSON(400, '收藏夹名称不能为空', null))
    }

    const collection = await Collection.create({
      name: String(name).trim(),
      description: description || null,
      userId: req.userId
    })

    return res.status(201).json(resJSON(0, 'ok', collection))
  } catch (err) {
    console.error('[POST /collections] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户所有收藏夹（含 recipes count）
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const collections = await Collection.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Recipe,
          as: 'recipes',
          through: { attributes: [] },
          attributes: ['id']
        }
      ]
    })

    const result = collections.map(c => {
      const data = c.toJSON()
      return {
        ...data,
        recipeCount: (data.recipes || []).length,
        recipes: undefined
      }
    })

    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /collections] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id — 单个收藏夹详情（含分页食谱列表）
// ─────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params

    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    let page = parseInt(req.query.page, 10) || 1
    let pageSize = parseInt(req.query.pageSize, 10) || 20
    if (page < 1) page = 1
    if (pageSize > 100) pageSize = 100
    if (pageSize < 1) pageSize = 20

    // 获取关联食谱总数
    const totalCount = await CollectionRecipe.count({
      where: { collectionId: id }
    })

    // 分页获取关联食谱
    const recipeRows = await CollectionRecipe.findAll({
      where: { collectionId: id },
      offset: (page - 1) * pageSize,
      limit: pageSize,
      include: [
        {
          model: Recipe,
          as: 'Recipe',
          attributes: [
            'id', 'title', 'coverImage', 'author', 'cookTime',
            'description', 'category', 'categoryTags', 'servings',
            'difficulty', 'userId', 'createdAt', 'updatedAt'
          ]
        }
      ]
    })

    const recipes = recipeRows.map(r => r.Recipe.toJSON())

    const data = collection.toJSON()
    data.recipes = recipes
    data.totalRecipes = totalCount
    data.page = page
    data.pageSize = pageSize

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[GET /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新收藏夹
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    const { name, description } = req.body
    const updateData = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(resJSON(400, '没有需要更新的字段', null))
    }

    await collection.update(updateData)

    return res.status(200).json(resJSON(0, 'ok', collection))
  } catch (err) {
    console.error('[PUT /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除收藏夹（级联删除关联记录）
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })

    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    // 级联删除关联记录
    await CollectionRecipe.destroy({ where: { collectionId: id } })
    await collection.destroy()

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /collections/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/recipes — 添加食谱到收藏夹（幂等）
// ─────────────────────────────────────────────────────────────────
router.post('/:id/recipes', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { recipeId } = req.body

    if (!recipeId) {
      return res.status(400).json(resJSON(400, 'recipeId 不能为空', null))
    }

    // 权限检查
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    // 检查食谱是否存在
    const recipe = await Recipe.findByPk(recipeId)
    if (!recipe) {
      return res.status(404).json(resJSON(404, '食谱不存在', null))
    }

    // 幂等：已添加不报错
    const [entry, created] = await CollectionRecipe.findOrCreate({
      where: { collectionId: id, recipeId },
      defaults: { collectionId: id, recipeId }
    })

    return res.status(created ? 201 : 200).json(
      resJSON(0, created ? '已添加' : '已在收藏夹中', entry)
    )
  } catch (err) {
    console.error('[POST /collections/:id/recipes] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id/recipes/:recipeId — 从收藏夹移除食谱
// ─────────────────────────────────────────────────────────────────
router.delete('/:id/recipes/:recipeId', auth, async (req, res) => {
  try {
    const { id, recipeId } = req.params

    // 权限检查
    const collection = await Collection.findOne({
      where: { id, userId: req.userId }
    })
    if (!collection) {
      return res.status(404).json(resJSON(404, '收藏夹不存在', null))
    }

    await CollectionRecipe.destroy({
      where: { collectionId: id, recipeId }
    })

    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /collections/:id/recipes/:recipeId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router