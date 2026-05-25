'use strict'

/**
 * routes/drafts.js
 * 食谱草稿系统路由
 *
 * GET    /drafts          — 获取用户草稿列表（分页）
 * POST   /drafts          — 创建/保存草稿
 * GET    /drafts/:id      — 获取单个草稿
 * PUT    /drafts/:id      — 更新草稿
 * DELETE /drafts/:id      — 删除草稿
 * POST   /drafts/:id/publish — 发布草稿（创建 Recipe）
 */

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { Draft, Recipe, User, Sequelize } = require('../models')
const Op = Sequelize.Op

function resJSON(code, message, data) {
  return { code, message, data }
}

// GET /drafts — 获取草稿列表
router.get('/drafts', auth, async (req, res) => {
  try {
    const userId = req.userId
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const status = req.query.status // optional filter: draft|scheduled|published
    const offset = (page - 1) * pageSize

    const where = { userId }
    if (status && ['draft', 'scheduled', 'published'].includes(status)) {
      where.status = status
    }

    const { count, rows } = await Draft.findAndCountAll({
      where,
      order: [['updatedAt', 'DESC']],
      offset,
      limit: pageSize
    })

    return res.json(resJSON(0, 'ok', {
      drafts: rows,
      total: count,
      page,
      pageSize
    }))
  } catch (err) {
    console.error('[GET /drafts] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// POST /drafts — 创建或保存草稿
router.post('/drafts', auth, async (req, res) => {
  try {
    const userId = req.userId
    const {
      title, description, category, ingredients, steps,
      servings, difficulty, cookTime, coverImage, tips,
      categoryTags, season, status, scheduledPublishAt
    } = req.body

    const draft = await Draft.create({
      title: title || '',
      description: description || null,
      category: category || null,
      ingredients: ingredients || [],
      steps: steps || [],
      servings: servings || null,
      difficulty: difficulty || null,
      cookTime: cookTime || null,
      coverImage: coverImage || null,
      tips: tips || null,
      categoryTags: categoryTags || [],
      season: season || null,
      userId,
      status: status === 'scheduled' ? 'scheduled' : 'draft',
      scheduledPublishAt: status === 'scheduled' ? (scheduledPublishAt || null) : null
    })

    return res.status(201).json(resJSON(0, '草稿已保存', draft))
  } catch (err) {
    console.error('[POST /drafts] Error:', err)
    return res.status(500).json(resJSON(500, '保存草稿失败', null))
  }
})

// GET /drafts/:id — 获取单个草稿
router.get('/drafts/:id', auth, async (req, res) => {
  try {
    const userId = req.userId
    const draft = await Draft.findOne({
      where: { id: req.params.id, userId }
    })

    if (!draft) {
      return res.status(404).json(resJSON(404, '草稿不存在', null))
    }

    return res.json(resJSON(0, 'ok', draft))
  } catch (err) {
    console.error('[GET /drafts/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// PUT /drafts/:id — 更新草稿
router.put('/drafts/:id', auth, async (req, res) => {
  try {
    const userId = req.userId
    const draft = await Draft.findOne({
      where: { id: req.params.id, userId }
    })

    if (!draft) {
      return res.status(404).json(resJSON(404, '草稿不存在', null))
    }

    if (draft.status === 'published') {
      return res.status(400).json(resJSON(400, '已发布的草稿不可编辑', null))
    }

    const allowed = [
      'title', 'description', 'category', 'ingredients', 'steps',
      'servings', 'difficulty', 'cookTime', 'coverImage', 'tips',
      'categoryTags', 'season', 'status', 'scheduledPublishAt'
    ]

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        draft.set(key, req.body[key])
      }
    }

    await draft.save()
    return res.json(resJSON(0, '草稿已更新', draft))
  } catch (err) {
    console.error('[PUT /drafts/:id] Error:', err)
    return res.status(500).json(resJSON(500, '更新草稿失败', null))
  }
})

// DELETE /drafts/:id — 删除草稿
router.delete('/drafts/:id', auth, async (req, res) => {
  try {
    const userId = req.userId
    const deleted = await Draft.destroy({
      where: { id: req.params.id, userId }
    })

    if (!deleted) {
      return res.status(404).json(resJSON(404, '草稿不存在', null))
    }

    return res.json(resJSON(0, '草稿已删除', null))
  } catch (err) {
    console.error('[DELETE /drafts/:id] Error:', err)
    return res.status(500).json(resJSON(500, '删除草稿失败', null))
  }
})

// POST /drafts/:id/publish — 发布草稿（创建 Recipe）
router.post('/drafts/:id/publish', auth, async (req, res) => {
  try {
    const userId = req.userId
    const draft = await Draft.findOne({
      where: { id: req.params.id, userId }
    })

    if (!draft) {
      return res.status(404).json(resJSON(404, '草稿不存在', null))
    }

    // Validate required fields
    if (!draft.title) {
      return res.status(400).json(resJSON(400, '食谱标题不能为空', null))
    }

    // Create Recipe from draft data
    const recipe = await Recipe.create({
      title: draft.title,
      description: draft.description || '',
      category: draft.category || '未分类',
      ingredients: draft.ingredients,
      steps: draft.steps,
      servings: draft.servings || 1,
      difficulty: draft.difficulty || '简单',
      cookTime: draft.cookTime || 15,
      coverImage: draft.coverImage || null,
      tips: draft.tips || null,
      categoryTags: draft.categoryTags || [],
      season: draft.season || null,
      userId
    })

    // Mark draft as published
    draft.status = 'published'
    await draft.save()

    return res.status(201).json(resJSON(0, '食谱已发布', { recipe, draft }))
  } catch (err) {
    console.error('[POST /drafts/:id/publish] Error:', err)
    return res.status(500).json(resJSON(500, '发布失败', null))
  }
})

module.exports = router