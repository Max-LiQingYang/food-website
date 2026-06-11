'use strict'

/**
 * categories.js
 * GET /api/categories/stats — 返回 10 个分类的统计数据
 */

const express = require('express')
const router = express.Router()
const { Recipe, Comment, sequelize } = require('../models')

router.get('/stats', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        r.category,
        COUNT(*) AS recipeCount,
        SUM(CASE WHEN r.difficulty = 'easy' THEN 1 ELSE 0 END) AS easyCount,
        SUM(CASE WHEN r.difficulty = 'medium' THEN 1 ELSE 0 END) AS mediumCount,
        SUM(CASE WHEN r.difficulty = 'hard' THEN 1 ELSE 0 END) AS hardCount,
        ROUND(AVG(r.cookTime), 0) AS avgCookTime,
        ROUND(AVG(r.servings), 0) AS avgServings
      FROM recipes r
      GROUP BY r.category
      ORDER BY recipeCount DESC
    `)

    // 获取各分类平均评分
    const categoryRatings = await Promise.all(
      rows.map(async (row) => {
        const [ratingRows] = await sequelize.query(
          'SELECT AVG(c.rating) AS avgRating FROM comments c JOIN recipes r ON c.recipeId = r.id WHERE r.category = ?',
          { replacements: [row.category] }
        )
        return {
          category: row.category,
          avgRating: ratingRows[0]?.avgRating
            ? Math.round(parseFloat(ratingRows[0].avgRating) * 10) / 10
            : 0,
        }
      })
    )

    // 获取各分类的 top 标签（从 categoryTags 中的 method/taste/occasion 提取）
    // 简化版：从 recipes 表中按 category 取 3 条热门食谱的 title 前 4 字作为标签
    const categoryTags = await Promise.all(
      rows.map(async (row) => {
        const [tagRecipes] = await sequelize.query(
          'SELECT title, categoryTags, viewCount FROM recipes WHERE category = ? ORDER BY favoriteCount DESC, viewCount DESC LIMIT 3',
          { replacements: [row.category] }
        )
        const tags = tagRecipes.map(r => {
          // 提取 categoryTags JSON 中的 taste/method 标签
          try {
            const ct = typeof r.categoryTags === 'string' ? JSON.parse(r.categoryTags) : (r.categoryTags || {})
            const tasteTags = (ct.taste || []).slice(0, 2)
            const methodTags = (ct.method || []).slice(0, 1)
            return [...tasteTags, ...methodTags].filter(Boolean).slice(0, 3)
          } catch {
            return []
          }
        }).flat().filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)
        return { category: row.category, tags }
      })
    )

    const ratingMap = Object.fromEntries(categoryRatings.map(r => [r.category, r.avgRating]))
    const tagMap = Object.fromEntries(categoryTags.map(r => [r.category, r.tags]))

    const stats = rows.map(row => ({
      category: row.category,
      recipeCount: row.recipeCount,
      difficulty: {
        easy: row.easyCount,
        medium: row.mediumCount,
        hard: row.hardCount,
      },
      avgCookTime: row.avgCookTime || 0,
      avgServings: row.avgServings || 0,
      avgRating: ratingMap[row.category] || 0,
      topTags: tagMap[row.category] || [],
    }))

    res.json({ code: 0, data: stats })
  } catch (err) {
    console.error('categories/stats error:', err)
    res.status(500).json({ code: 1, message: '服务器错误' })
  }
})

module.exports = router
