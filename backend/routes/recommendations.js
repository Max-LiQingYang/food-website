"use strict"

/**
 * routes/recommendations.js
 * 个性化推荐路由
 *
 * GET /recommendations/personalized — 基于用户收藏历史+偏好的个性化推荐
 * GET /recommendations/popular      — 热门食谱推荐
 */

const express = require('express')
const router = express.Router()

const { Recipe, User, Favorite } = require('../models')
const { Op } = require('sequelize')
const auth = require('../middleware/auth')

const LIST_ATTRIBUTES = [
  'id', 'title', 'description', 'category', 'difficulty',
  'servings', 'cookTime', 'coverImage', 'season',
  'favoriteCount', 'commentCount', 'viewCount',
  'categoryTags', 'nutrition', 'tips'
]

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─── GET /recommendations/personalized ───
router.get('/recommendations/personalized', auth, async (req, res) => {
  try {
    const userId = req.userId
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 12)

    // 1. Get user's favorite recipes
    const favorites = await Favorite.findAll({
      where: { userId },
      include: [{ model: Recipe, as: 'recipe', attributes: ['id', 'category', 'categoryTags', 'title'] }],
      order: [['createdAt', 'DESC']],
      limit: 30
    })

    const favoritedIds = favorites.map(f => f.recipeId)
    const favCategories = favorites
      .map(f => f.recipe ? f.recipe.category : null)
      .filter(Boolean)

    const categoryCounts = {}
    favCategories.forEach(c => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1
    })

    const topCategories = Object.entries(categoryCounts)
      .sort(function(a, b) { return b[1] - a[1] })
      .slice(0, 3)
      .map(function(entry) { return entry[0] })

    // 2. Get user preferences
    let prefCuisine = ''
    try {
      const user = await User.findByPk(userId, { attributes: ['preferences'] })
      if (user && user.preferences) {
        const prefs = typeof user.preferences === 'string'
          ? JSON.parse(user.preferences)
          : user.preferences
        prefCuisine = prefs.cuisine || ''
      }
    } catch (e) { /* ignore */ }

    // 3. Find recommendations
    const categoryWhere = topCategories.length > 0
      ? { category: { [Op.in]: topCategories } }
      : {}

    const excludeWhere = favoritedIds.length > 0
      ? { id: { [Op.notIn]: favoritedIds } }
      : {}

    const where = Object.assign({}, categoryWhere, excludeWhere)

    let recipes = await Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      where: where,
      order: [['favoriteCount', 'DESC']],
      limit: limit
    })

    // 4. Build reasons for each recommendation
    const result = recipes.map(function(r) {
      const reasons = []
      const favsWithCategory = favorites.filter(function(f) {
        return f.recipe && f.recipe.category === r.category
      }).slice(0, 2)

      favsWithCategory.forEach(function(f) {
        if (f.recipe && f.recipe.title) {
          reasons.push('因为你收藏了「' + f.recipe.title + '」')
        }
      })

      if (prefCuisine && r.category && r.category.toLowerCase().includes(prefCuisine.toLowerCase())) {
        reasons.push('与你的口味偏好匹配')
      }

      if (reasons.length === 0) {
        reasons.push('热门推荐')
      }

      const uniqueReasons = [...new Set(reasons)]
      return Object.assign({}, r.toJSON(), {
        reason: uniqueReasons.slice(0, 2).join('；')
      })
    })

    return res.status(200).json(resJSON(0, 'success', { recipes: result }))
  } catch (err) {
    console.error('[GET /recommendations/personalized] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─── GET /recommendations/popular ───
router.get('/recommendations/popular', async (req, res) => {
  try {
    const limit = Math.min(30, parseInt(req.query.limit, 10) || 12)
    const recipes = await Recipe.findAll({
      attributes: LIST_ATTRIBUTES,
      order: [['favoriteCount', 'DESC']],
      limit: limit
    })
    return res.status(200).json(resJSON(0, 'success', { recipes }))
  } catch (err) {
    console.error('[GET /recommendations/popular] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router