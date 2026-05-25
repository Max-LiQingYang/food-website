'use strict'

/**
 * routes/admin.js
 * 管理后台 API — 内容质量仪表板
 *
 * 端点：
 *   GET /api/admin/quality-report — 数据质量报告
 *   GET /api/admin/quality-report?days=7 — 近 N 天趋势
 */

const express = require('express')
const router = express.Router()
const { Recipe, User, Comment, sequelize } = require('../models')
const { Op, fn, col, literal } = require('sequelize')

// 质量评分阈值
const QUALITY_THRESHOLDS = {
  excellent: 9,
  good: 7,
  fair: 5,
  poor: 3,
}

/**
 * 计算单道食谱的质量评分
 */
function computeScore(recipe) {
  if (!recipe) return 0

  // 食材完整度 (0~10)
  let ingredients = recipe.ingredients
  if (typeof ingredients === 'string') {
    try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
  }
  const ingCount = Array.isArray(ingredients) ? ingredients.length : 0
  const ingScore = Math.min(ingCount, 10) * 0.5 + (ingCount >= 2 ? 1 : 0) + (ingCount >= 5 ? 1 : 0)

  // 步骤清晰度 (0~10)
  let steps = recipe.steps
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps) } catch { steps = [] }
  }
  const stepCount = Array.isArray(steps) ? steps.length : 0
  const timePattern = /\d+\s*(分钟|小时|min|h)/i
  const stepsWithTime = Array.isArray(steps) ? steps.filter(s => {
    const t = typeof s === 'string' ? s : (s.description || s.text || '')
    return timePattern.test(t)
  }).length : 0
  const stepScore = Math.min(stepCount, 8) * 0.3 +
                    (stepCount >= 3 ? 0.5 : 0) +
                    (stepCount >= 5 ? 0.5 : 0) +
                    Math.min(stepsWithTime / Math.max(stepCount, 1) * 2, 2)

  // 营养信息 (0~10)
  let nutrition = recipe.nutrition
  if (typeof nutrition === 'string') {
    try { nutrition = JSON.parse(nutrition) } catch { nutrition = {} }
  }
  const nutFields = ['calories', 'protein', 'fat', 'fiber', 'sodium']
  const nutCount = nutFields.filter(k => nutrition && nutrition[k] != null && nutrition[k] !== '' && nutrition[k] !== 0).length
  const nutScore = nutCount * 2

  // 综合 (0~10)
  const total = Math.round(
    (ingScore / 10) * 3.5 +
    (stepScore / 10) * 4 +
    (nutScore / 10) * 2.5
  )
  return Math.min(Math.max(total, 0), 10)
}

function getLabel(score) {
  if (score >= 9) return '优秀'
  if (score >= 7) return '良好'
  if (score >= 5) return '一般'
  if (score >= 3) return '较差'
  return '差'
}

// ─── GET /api/admin/quality-report ──────────────────────────────
router.get('/admin/quality-report', async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // ── 1. 食谱数据完整度统计 ──
    const allRecipes = await Recipe.findAll({ raw: true })

    let hasCover = 0
    let hasNutrition = 0
    let hasSteps = 0
    let totalRecipes = allRecipes.length
    const scoreDist = { 优秀: 0, 良好: 0, 一般: 0, 较差: 0, 差: 0 }

    allRecipes.forEach(r => {
      if (r.coverImage) hasCover++
      if (r.nutrition) {
        let n = r.nutrition
        if (typeof n === 'string') { try { n = JSON.parse(n) } catch { n = {} } }
        if (n && (n.calories || n.protein || n.fat)) hasNutrition++
      }
      if (r.steps) {
        let s = r.steps
        if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = [] } }
        if (Array.isArray(s) && s.length > 0) hasSteps++
      }

      const score = computeScore(r)
      const label = getLabel(score)
      scoreDist[label] = (scoreDist[label] || 0) + 1
    })

    // ── 2. 聚合统计 ──
    const avgResult = await Recipe.findOne({
      attributes: [
        [fn('AVG', col('favoriteCount')), 'avgFav'],
        [fn('AVG', col('commentCount')), 'avgComment'],
        [fn('AVG', col('viewCount')), 'avgView'],
        [fn('AVG', col('avgRating')), 'avgRating'],
      ],
      raw: true,
    })

    // ── 3. 近 N 天新增 ──
    const [newRecipes, newComments, newUsers] = await Promise.all([
      Recipe.count({ where: { createdAt: { [Op.gte]: since } } }),
      Comment.count({ where: { createdAt: { [Op.gte]: since } } }),
      User.count({ where: { createdAt: { [Op.gte]: since } } }),
    ])

    // ── 4. 近 30 天每日活跃度趋势 ──
    const thirtyDays = 30
    const daySince = new Date(Date.now() - thirtyDays * 24 * 60 * 60 * 1000)

    const dailyActivity = await Comment.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('COUNT', literal('1')), 'count'],
      ],
      where: { createdAt: { [Op.gte]: daySince } },
      group: [fn('DATE', col('createdAt'))],
      order: [[fn('DATE', col('createdAt')), 'ASC']],
      raw: true,
    })

    // 补全无评论的日期
    const activityMap = {}
    dailyActivity.forEach(d => {
      activityMap[d.date] = parseInt(d.count, 10)
    })
    const trend = []
    for (let i = thirtyDays - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().split('T')[0]
      trend.push({ date: key, count: activityMap[key] || 0 })
    }

    // ── 5. 低质量食谱列表 ──
    const lowQuality = allRecipes
      .map(r => ({ ...r, _score: computeScore(r) }))
      .filter(r => r._score < 5)
      .sort((a, b) => a._score - b._score)
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        title: r.title,
        score: r._score,
        label: getLabel(r._score),
        hasCover: !!r.coverImage,
        hasNutrition: !!(r.nutrition && JSON.parse(JSON.stringify(r.nutrition)).calories),
        ingredientCount: Array.isArray(r.ingredients) ? r.ingredients.length : 0,
        stepCount: Array.isArray(r.steps) ? r.steps.length : 0,
      }))

    res.json({
      code: 0,
      data: {
        summary: {
          totalRecipes,
          withCover: { count: hasCover, pct: totalRecipes ? Math.round(hasCover / totalRecipes * 100) : 0 },
          withNutrition: { count: hasNutrition, pct: totalRecipes ? Math.round(hasNutrition / totalRecipes * 100) : 0 },
          withSteps: { count: hasSteps, pct: totalRecipes ? Math.round(hasSteps / totalRecipes * 100) : 0 },
        },
        scoreDistribution: scoreDist,
        averages: {
          avgFavoriteCount: avgResult?.avgFav ? Math.round(avgResult.avgFav * 10) / 10 : 0,
          avgCommentCount: avgResult?.avgComment ? Math.round(avgResult.avgComment * 10) / 10 : 0,
          avgViewCount: avgResult?.avgView ? Math.round(avgResult.avgView * 10) / 10 : 0,
          avgRating: avgResult?.avgRating ? Math.round(avgResult.avgRating * 10) / 10 : 0,
        },
        recentActivity: {
          days,
          newRecipes,
          newComments,
          newUsers,
        },
        trend,
        lowQualityRecipes: lowQuality,
      },
    })
  } catch (err) {
    console.error('[GET /admin/quality-report] Error:', err)
    res.status(500).json({ code: 500, message: '获取质量报告失败', error: err.message })
  }
})

module.exports = router
module.exports.computeScore = computeScore
module.exports.getLabel = getLabel