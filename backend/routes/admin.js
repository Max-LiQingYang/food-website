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

  // ingredients/steps/nutrition already parsed by Sequelize getter (or manually below for raw queries)
  let ingredients = recipe.ingredients
  const ingCount = Array.isArray(ingredients) ? ingredients.length : 0
  const ingScore = Math.min(ingCount, 10) * 0.5 + (ingCount >= 2 ? 1 : 0) + (ingCount >= 5 ? 1 : 0)

  let steps = recipe.steps
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

  // nutrition already parsed by Sequelize getter (or manual parse for raw queries below)
  let nutrition = recipe.nutrition
  const nutFields = ['calories', 'protein', 'fat', 'fiber', 'sodium']
  const nutCount = nutFields.filter(k => nutrition && nutrition[k] != null && nutrition[k] !== '' && nutrition[k] !== 0).length
  const nutScore = nutCount * 2

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

// ── Helper: manually parse JSON fields for raw:true queries (getters don't fire on raw) ──
function parseRawFields(recipe) {
  const r = { ...recipe }
  for (const field of ['ingredients', 'steps', 'nutrition', 'categoryTags']) {
    if (typeof r[field] === 'string') {
      try { r[field] = JSON.parse(r[field]) } catch { r[field] = null }
    }
  }
  return r
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
      const parsed = parseRawFields(r)
      if (r.coverImage) hasCover++
      if (parsed.nutrition) {
        const n = parsed.nutrition
        if (n && (n.calories || n.protein || n.fat)) hasNutrition++
      }
      if (parsed.steps) {
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) hasSteps++
      }

      const score = computeScore(parsed)
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
      .map(r => ({ ...r, ...parseRawFields(r), _score: computeScore(parseRawFields(r)) }))
      .filter(r => r._score < 5)
      .sort((a, b) => a._score - b._score)
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        title: r.title,
        score: r._score,
        label: getLabel(r._score),
        hasCover: !!r.coverImage,
        hasNutrition: !!(r.nutrition && r.nutrition.calories),
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

// ─── GET /api/admin/content-quality ──────────────────────────────
router.get('/admin/content-quality', async (req, res) => {
  try {
    const { Recipe, VideoEmbed } = require('../models')

    // Get all recipes with raw:true for full scan (need to manually parse)
    const allRecipes = await Recipe.findAll({ raw: true })

    // Batch fetch video recipeIds
    const videoRecords = await VideoEmbed.findAll({
      attributes: ['recipeId'],
      group: ['recipeId'],
      raw: true,
    })
    const videoRecipeIds = new Set(videoRecords.map(v => v.recipeId))

    const FIELD_LABELS = {
      coverImage: '封面',
      ingredients: '食材',
      steps: '步骤',
      nutrition: '营养',
      story: '故事',
      culturalBackground: '文化',
      tips: '贴士',
      video: '视频',
    }

    const fieldKeys = Object.keys(FIELD_LABELS)
    const fieldCoverage = {}
    const totalRecipes = allRecipes.length

    // Init fieldCoverage counters
    for (const key of fieldKeys) {
      fieldCoverage[key] = { count: 0, pct: 0 }
    }

    const recipeResults = []
    const scores = []

    for (const r of allRecipes) {
      const parsed = parseRawFields(r)
      const fieldStatus = {}
      let score = 0

      // 1. coverImage
      fieldStatus.coverImage = !!(r.coverImage && r.coverImage.includes('http'))
      if (fieldStatus.coverImage) { score++; fieldCoverage.coverImage.count++ }

      // 2. ingredients
      fieldStatus.ingredients = Array.isArray(parsed.ingredients) && parsed.ingredients.length >= 2
      if (fieldStatus.ingredients) { score++; fieldCoverage.ingredients.count++ }

      // 3. steps
      fieldStatus.steps = Array.isArray(parsed.steps) && parsed.steps.length >= 2
      if (fieldStatus.steps) { score++; fieldCoverage.steps.count++ }

      // 4. nutrition: non-empty, has calories + at least 2 other fields
      let nutOk = false
      if (parsed.nutrition && typeof parsed.nutrition === 'object') {
        const n = parsed.nutrition
        if (n.calories != null) {
          const otherFields = ['protein', 'fat', 'carbs', 'fiber', 'sodium']
          const filledOthers = otherFields.filter(k => n[k] != null && n[k] !== '')
          if (filledOthers.length >= 2) nutOk = true
        }
      }
      fieldStatus.nutrition = nutOk
      if (fieldStatus.nutrition) { score++; fieldCoverage.nutrition.count++ }

      // 5. story
      fieldStatus.story = !!(r.story && String(r.story).length >= 20)
      if (fieldStatus.story) { score++; fieldCoverage.story.count++ }

      // 6. culturalBackground
      fieldStatus.culturalBackground = !!(r.culturalBackground && String(r.culturalBackground).length >= 20)
      if (fieldStatus.culturalBackground) { score++; fieldCoverage.culturalBackground.count++ }

      // 7. tips
      fieldStatus.tips = !!(r.tips && String(r.tips).length >= 10)
      if (fieldStatus.tips) { score++; fieldCoverage.tips.count++ }

      // 8. video
      fieldStatus.video = videoRecipeIds.has(r.id)
      if (fieldStatus.video) { score++; fieldCoverage.video.count++ }

      scores.push(score)
      recipeResults.push({
        id: r.id,
        title: r.title,
        score,
        fieldStatus,
      })
    }

    // Calculate fieldCoverage percentages
    for (const key of fieldKeys) {
      fieldCoverage[key].pct = totalRecipes > 0
        ? Math.round(fieldCoverage[key].count / totalRecipes * 1000) / 10
        : 0
    }

    // Overall score distribution
    const distribution = {}
    for (const s of scores) {
      const label = `${s}分`
      distribution[label] = (distribution[label] || 0) + 1
    }

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
      : 0

    // Bottom 10 recipes
    const bottomRecipes = recipeResults
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        title: r.title,
        score: r.score,
        missingFields: Object.entries(r.fieldStatus)
          .filter(([, ok]) => !ok)
          .map(([key]) => key),
      }))

    res.json({
      code: 0,
      data: {
        totalRecipes,
        fieldCoverage,
        overallScore: { avg: avgScore, distribution },
        bottomRecipes,
        recipes: recipeResults,
      },
    })
  } catch (err) {
    console.error('[GET /admin/content-quality] Error:', err)
    res.status(500).json({ code: 500, message: '获取内容质量报告失败', error: err.message })
  }
})

module.exports = router
module.exports.computeScore = computeScore
module.exports.getLabel = getLabel