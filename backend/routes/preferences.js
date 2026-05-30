'use strict'

/**
 * routes/preferences.js
 * 用户偏好设置路由
 *
 * GET  /preferences     — 获取当前用户偏好
 * PUT  /preferences     — 更新偏好
 * GET  /recommend-by-preference — 基于偏好的食谱推荐
 */

const express = require('express')
const { User, Recipe, Sequelize } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

const Op = Sequelize.Op

const LIST_ATTRIBUTES = [
  'id', 'title', 'description', 'category', 'difficulty',
  'servings', 'cookTime', 'coverImage', 'season',
  'favoriteCount', 'commentCount', 'viewCount',
  'categoryTags', 'nutrition', 'tips'
  // 注意：avgRating, ratingCount, qualityScore, qualityLabel 不在生产 DB 表结构中
]

/** 默认偏好设置 */
const DEFAULT_PREFERENCES = {
  diet: '',          // '' | 'vegetarian' | 'vegan' | 'low-carb' | 'low-calorie' | 'gluten-free'
  cuisine: '',       // '' | 'chinese' | 'western' | 'japanese' | 'korean' | 'indian' | 'thai' | 'vietnamese'
  difficulty: '',    // '' | 'easy' | 'medium' | 'hard'
  maxCookTime: '',   // '' (no limit) or minutes string like '30'
  allergies: [],     // string array: ['花生', '海鲜', '乳制品']
  excludedIngredients: [], // string[]
}

/**
 * 获取用户的偏好设置（解析 JSON）
 */
async function getUserPreferences(userId) {
  const user = await User.findByPk(userId, { attributes: ['preferences'] })
  if (!user) return { ...DEFAULT_PREFERENCES }

  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(user.preferences || '{}') }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

// ── GET /preferences — 获取当前用户偏好 ──
router.get('/', auth, async (req, res) => {
  try {
    const prefs = await getUserPreferences(req.userId)

    return res.status(200).json({ code: 0, message: 'ok', data: prefs })
  } catch (err) {
    console.error('[GET /preferences] Error:', err)
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

// ── PUT /preferences — 更新偏好 ──
router.put('/', auth, async (req, res) => {
  try {
    const current = await getUserPreferences(req.userId)
    const updates = req.body

    // 只允许更新预设字段
    const allowedFields = ['diet', 'cuisine', 'difficulty', 'maxCookTime', 'allergies', 'excludedIngredients']
    const merged = { ...current }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        merged[field] = updates[field]
      }
    }

    await User.update(
      { preferences: JSON.stringify(merged) },
      { where: { id: req.userId } }
    )

    return res.status(200).json({ code: 0, message: '已更新偏好设置', data: merged })
  } catch (err) {
    console.error('[PUT /preferences] Error:', err)
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

// ── GET /recommend-by-preference — 基于偏好的食谱推荐 ──
router.get('/recommend-by-preference', auth, async (req, res) => {
  try {
    const prefs = await getUserPreferences(req.userId)
    const where = {}

    // 菜系筛选
    if (prefs.cuisine) {
      where.category = prefs.cuisine
    }

    // 难度筛选
    if (prefs.difficulty) {
      where.difficulty = prefs.difficulty
    }

    // 最大烹饪时间
    if (prefs.maxCookTime) {
      const maxMin = parseInt(prefs.maxCookTime, 10)
      if (!isNaN(maxMin) && maxMin > 0) {
        // 使用 Sequelize 提取 cookTime 数值部分
        where.cookTime = { [Op.lte]: `${maxMin}` }
      }
    }

    // 素食/纯素：category 排除肉类菜
    if (prefs.diet === 'vegetarian' || prefs.diet === 'vegan') {
      if (!where.category) {
        // 没有特定 cuisines 限制时保留所有类别
        // 通过 categoryTags 或 manual filtering
      }
    }

    // 排除的食材：后端过滤
    const excluded = (prefs.excludedIngredients || []).filter(Boolean).map(s => s.toLowerCase())

    // 查询（按收藏数排序作为 qualityScore 的近似替代）
    let recipes = await Recipe.findAll({
      where,
      attributes: LIST_ATTRIBUTES,
      order: [['favoriteCount', 'DESC']],
      limit: 20,
    })

    // 后过滤排除食材
    if (excluded.length > 0) {
      recipes = recipes.filter(r => {
        // getter 已解析为数组，直接使用；否则 JSON.parse 字符串
        const ingredients = Array.isArray(r.ingredients) ? r.ingredients
          : (r.ingredients ? JSON.parse(r.ingredients) : [])
        const names = ingredients.map(i => (i.name || '').toLowerCase())
        return !excluded.some(ex => names.includes(ex))
      })
    }

    // 设置 qualityLabel（使用 favoriteCount 近似替代 qualityScore）
    recipes = recipes.map(r => {
      const d = r.toJSON()
      d.qualityScore = d.favoriteCount * 2 + d.commentCount * 1.5 + d.viewCount * 0.3
      d.qualityLabel = d.qualityScore >= 20 ? '热门' : d.qualityScore >= 8 ? '高分' : d.qualityScore >= 3 ? '品质' : '普通'
      return d
    })

    return res.status(200).json({
      code: 0, message: 'ok',
      data: { list: recipes, preferences: prefs }
    })
  } catch (err) {
    console.error('[GET /recommend-by-preference] Error:', err)
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

module.exports = router