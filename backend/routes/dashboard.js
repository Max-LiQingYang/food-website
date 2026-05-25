'use strict'

/**
 * routes/dashboard.js
 * 作者统计仪表板路由
 *
 * GET /  — 获取作者统计数据（浏览量趋势、收藏趋势、评分分布、评论词云、收入估算）
 */

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { Recipe, Comment, Favorite, User, Sequelize, sequelize } = require('../models')
const Op = Sequelize.Op

function resJSON(code, message, data) {
  return { code, message, data }
}

// GET / — 作者统计数据
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId

    // Get user's recipes
    const myRecipes = await Recipe.findAll({
      where: { userId },
      attributes: ['id', 'title', 'viewCount', 'favoriteCount', 'createdAt', 'qualityScore']
    })

    const recipeIds = myRecipes.map(r => r.id)

    // 1. Basic stats
    const totalRecipes = myRecipes.length
    const totalViews = myRecipes.reduce((sum, r) => sum + (r.viewCount || 0), 0)
    const totalFavorites = myRecipes.reduce((sum, r) => sum + (r.favoriteCount || 0), 0)
    const totalComments = await Comment.count({ where: { recipeId: { [Op.in]: recipeIds } } })

    // 2. View trend (last 30 days - best estimate from Recipe data since we don't have daily view tracking)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Generate daily view estimates based on recipe age and view count
    const viewTrend = []
    const favTrend = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)

      // Estimate daily views: proportional distribution across days since creation
      let dailyViews = 0
      let dailyFavs = 0
      for (const recipe of myRecipes) {
        const daysSinceCreation = Math.max(1, Math.ceil((Date.now() - new Date(recipe.createdAt).getTime()) / 86400000))
        if (daysSinceCreation <= 30 && i < daysSinceCreation) {
          dailyViews += Math.round((recipe.viewCount || 0) / daysSinceCreation * 0.3)
          dailyFavs += Math.round((recipe.favoriteCount || 0) / daysSinceCreation * 0.3)
        }
      }

      viewTrend.push({ date: dateStr, views: dailyViews })
      favTrend.push({ date: dateStr, favorites: dailyFavs })
    }

    // 3. Rating distribution from comments
    const ratingDistribution = await Comment.findAll({
      where: {
        recipeId: { [Op.in]: recipeIds },
        rating: { [Op.ne]: null }
      },
      attributes: ['rating', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['rating'],
      raw: true
    })

    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratingDistribution.forEach(r => {
      ratingDist[r.rating] = parseInt(r.count, 10)
    })

    // 4. Comment word cloud keywords
    const recentComments = await Comment.findAll({
      where: { recipeId: { [Op.in]: recipeIds } },
      attributes: ['content'],
      limit: 100,
      order: [['createdAt', 'DESC']]
    })

    // Extract keywords from comments
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '这个', '那个', '什么', '怎么', '为什么', '非常', '真的', '但是', '而且', '因为', '所以', '如果', '虽然', '可以', '应该', '能够', '可能', '已经', '还是', '就是', '只是', '不是', '觉得', '感觉', '好吃', '不错', '喜欢', '太', '很'])
    const wordFreq = {}
    recentComments.forEach(c => {
      const text = c.content || ''
      // Split by common delimiters and extract meaningful words (2-4 chars)
      const words = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
      words.forEach(w => {
        if (!stopWords.has(w) && w.length >= 2) {
          wordFreq[w] = (wordFreq[w] || 0) + 1
        }
      })
    })

    // Top 30 keywords
    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([text, value]) => ({ text, value }))

    // 5. Revenue estimate (virtual points)
    const pointsFromViews = Math.round(totalViews * 0.1)
    const pointsFromFavs = totalFavorites * 5
    const pointsFromComments = totalComments * 3
    const totalPoints = pointsFromViews + pointsFromFavs + pointsFromComments

    // 6. Recipe performance list
    const topRecipes = myRecipes
      .map(r => ({
        id: r.id,
        title: r.title,
        views: r.viewCount || 0,
        favorites: r.favoriteCount || 0,
        qualityScore: r.qualityScore || 0,
        points: Math.round((r.viewCount || 0) * 0.1 + (r.favoriteCount || 0) * 5)
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)

    return res.json(resJSON(0, 'ok', {
      basic: {
        totalRecipes,
        totalViews,
        totalFavorites,
        totalComments,
        totalPoints
      },
      viewTrend,
      favTrend,
      ratingDistribution: ratingDist,
      wordCloud,
      topRecipes
    }))
  } catch (err) {
    console.error('[GET /dashboard] Error:', err)
    return res.status(500).json(resJSON(500, '获取统计数据失败', null))
  }
})

module.exports = router