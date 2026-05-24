'use strict'

/**
 * routes/ingredientSearch.js
 * 智能食材搜索 — POST /recipes/by-ingredients
 * 手头食材匹配推荐 + 缺少食材提示
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { Recipe } = require('../models')

// 通过手头食材搜索匹配食谱
router.post('/recipes/by-ingredients', async (req, res) => {
  try {
    const { ingredients = [], page = '1', pageSize = '20', strictMode = false } = req.body

    if (!ingredients.length) {
      return res.status(400).json({ code: 400, message: '请提供至少一种食材' })
    }

    // 对每种食材构建 LIKE 条件
    const ingredientsWhere = {
      [Op.and]: ingredients.map(ing => ({
        ingredients: { [Op.like]: `%${ing.trim()}%` },
      })),
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const { count, rows } = await Recipe.findAndCountAll({
      where: ingredientsWhere,
      limit: parseInt(pageSize),
      offset,
      attributes: ['id', 'title', 'coverImage', 'description', 'category', 'difficulty', 'cookTime', 'servings', 'ingredients', 'favoriteCount', 'nutrition'],
    })

    // 计算匹配度：每个食谱的食材 JSON 与用户提供的食材匹配数量
    const result = rows.map(recipe => {
      let recipeIngredients = []
      try {
        const parsed = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients
        recipeIngredients = Array.isArray(parsed) ? parsed.map((i) => typeof i === 'string' ? i : (i.name || '')).filter(Boolean) : []
      } catch { recipeIngredients = [] }

      // 获取用户提供食材的小写列表
      const userIngLower = ingredients.map(i => i.trim().toLowerCase())

      // 匹配的食材
      const matchedIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return userIngLower.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })

      // 缺少的食材
      const missingIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return !userIngLower.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })

      const matchRatio = recipeIngredients.length > 0
        ? Math.round((matchedIngredients.length / recipeIngredients.length) * 100)
        : 0

      return {
        ...recipe.toJSON(),
        matchRatio,
        matchedIngredients: matchedIngredients.slice(0, 5),
        missingIngredients: missingIngredients.slice(0, 10),
        matchCount: matchedIngredients.length,
        totalIngredients: recipeIngredients.length,
      }
    })

    // 按匹配度降序排序
    result.sort((a, b) => b.matchRatio - a.matchRatio)

    res.json({
      code: 0,
      data: {
        list: result,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        userIngredients: ingredients,
      },
    })
  } catch (err) {
    console.error('[POST /by-ingredients] error:', err.message)
    res.status(500).json({ code: 500, message: '食材搜索失败' })
  }
})

module.exports = router