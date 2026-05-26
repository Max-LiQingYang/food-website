'use strict'

/**
 * routes/recipeForks.js
 * 食谱克隆与改编系统（Recipe Fork）
 * — POST /:id/fork    创建改编版本（需登录）
 * — GET  /:id/forks   获取改编列表（公开）
 * — GET  /:id/fork-lineage  获取改编谱系（公开）
 *
 * 使用 req.userId（由 auth 中间件设置），不是 req.user.userId
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { RecipeFork, Recipe, User } = require('../models')
const auth = require('../middleware/auth')

const FORK_LIST_ATTRIBUTES = ['id', 'title', 'coverImage', 'description', 'category', 'cookTime', 'servings', 'difficulty', 'createdAt']
const USER_LIST_ATTRIBUTES = ['id', 'nickname', 'username']

// ── 创建改编版本 ────────────────────────────────────────────────────────────
// POST /api/recipes/:id/fork （auth 保护）
router.post('/:id/fork', auth, async (req, res) => {
  try {
    const originalId = req.params.id
    const userId = req.userId
    const { changesNote } = req.body

    // 检查原食谱是否存在
    const original = await Recipe.findByPk(originalId)
    if (!original) {
      return res.status(404).json({ success: false, message: '原食谱不存在' })
    }

    // 解析 JSON 字段
    let ingredients = original.ingredients
    let steps = original.steps
    let nutrition = original.nutrition
    let categoryTags = original.categoryTags
    try {
      if (typeof ingredients === 'string') ingredients = JSON.parse(ingredients)
    } catch (e) { /* keep as-is */ }
    try {
      if (typeof steps === 'string') steps = JSON.parse(steps)
    } catch (e) { /* keep as-is */ }
    try {
      if (typeof nutrition === 'string') nutrition = JSON.parse(nutrition)
    } catch (e) { /* keep as-is */ }
    try {
      if (typeof categoryTags === 'string') categoryTags = JSON.parse(categoryTags)
    } catch (e) { /* keep as-is */ }

    // 创建改编新食谱
    const forkedRecipe = await Recipe.create({
      title: original.title + '（改编）',
      description: original.description || '',
      ingredients: JSON.stringify(ingredients),
      steps: JSON.stringify(steps),
      cookTime: original.cookTime,
      servings: original.servings,
      difficulty: original.difficulty,
      category: original.category,
      categoryTags: JSON.stringify(categoryTags),
      nutrition: JSON.stringify(nutrition),
      coverImage: original.coverImage,
      userId // 新食谱归属当前用户
    })

    // 创建 fork 关联记录
    await RecipeFork.create({
      originalRecipeId: originalId,
      forkedRecipeId: forkedRecipe.id,
      forkedByUserId: userId,
      changesNote: changesNote || null
    })

    return res.json({
      success: true,
      recipeId: forkedRecipe.id,
      title: forkedRecipe.title
    })
  } catch (err) {
    console.error('[POST /:id/fork] Error:', err)
    return res.status(500).json({ success: false, message: '创建改编失败' })
  }
})

// ── 获取改编列表 ────────────────────────────────────────────────────────────
// GET /api/recipes/:id/forks（公开）
router.get('/:id/forks', async (req, res) => {
  try {
    const originalId = req.params.id
    const { page = '1', pageSize = '20' } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)

    const { count, rows } = await RecipeFork.findAndCountAll({
      where: { originalRecipeId: originalId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset,
      include: [
        {
          model: Recipe,
          as: 'forkedRecipe',
          attributes: FORK_LIST_ATTRIBUTES
        },
        {
          model: User,
          as: 'forkedBy',
          attributes: USER_LIST_ATTRIBUTES
        }
      ]
    })

    const forks = rows.map(f => ({
      id: f.forkedRecipe.id,
      title: f.forkedRecipe.title,
      coverImage: f.forkedRecipe.coverImage,
      description: f.forkedRecipe.description,
      category: f.forkedRecipe.category,
      cookTime: f.forkedRecipe.cookTime,
      servings: f.forkedRecipe.servings,
      difficulty: f.forkedRecipe.difficulty,
      createdAt: f.forkedRecipe.createdAt,
      forkedBy: f.forkedBy ? { id: f.forkedBy.id, nickname: f.forkedBy.nickname, username: f.forkedBy.username } : null,
      changesNote: f.changesNote,
      forkedAt: f.createdAt
    }))

    return res.json({
      success: true,
      count,
      forks,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })
  } catch (err) {
    console.error('[GET /:id/forks] Error:', err)
    return res.status(500).json({ success: false, message: '获取改编列表失败' })
  }
})

// ── 获取改编谱系（向上追溯） ──────────────────────────────────────────────
// GET /api/recipes/:id/fork-lineage（公开）
router.get('/:id/fork-lineage', async (req, res) => {
  try {
    const recipeId = req.params.id
    const lineage = []
    let currentId = recipeId
    let depth = 0
    const MAX_DEPTH = 10

    // 从当前食谱往上追溯，直到没有 originalRecipeId
    while (currentId && depth < MAX_DEPTH) {
      const forkRecord = await RecipeFork.findOne({
        where: { forkedRecipeId: currentId },
        include: [
          {
            model: Recipe,
            as: 'originalRecipe',
            attributes: ['id', 'title']
          }
        ]
      })

      if (!forkRecord || !forkRecord.originalRecipe) break

      lineage.push({
        id: forkRecord.originalRecipe.id,
        title: forkRecord.originalRecipe.title,
        isOriginal: false
      })

      currentId = forkRecord.originalRecipeId
      depth++
    }

    // 谱系反转：从最原始到当前
    lineage.reverse()

    // 添加当前食谱（最新）
    const currentRecipe = await Recipe.findByPk(recipeId, { attributes: ['id', 'title'] })

    return res.json({
      success: true,
      lineage: [
        ...(lineage.length > 0 ? lineage : []),
        ...(currentRecipe ? [{ id: currentRecipe.id, title: currentRecipe.title, isOriginal: false }] : [])
      ],
      isFork: lineage.length > 0,
      forkDepth: lineage.length
    })
  } catch (err) {
    console.error('[GET /:id/fork-lineage] Error:', err)
    return res.status(500).json({ success: false, message: '获取谱系失败' })
  }
})

// ── 获取用户的所有改编食谱 ──────────────────────────────────────────────
// GET /api/users/:id/forks（公开，通过用户路由挂载但放在此文件中）
router.get('/', async (req, res) => {
  // 这个路由不会匹配到，因为 recipeForks 挂载在 /recipes 下
  // 真正使用时会通过 userRoutes 转发
  return res.status(404).json({ success: false, message: '请通过 /api/users/:id/forks 访问' })
})

module.exports = router