'use strict'

/**
 * routes/compare.js
 * 食谱对比功能路由
 *
 * POST /compare — 对比 2-3 个食谱的营养/难度/时间/食材
 */

const express = require('express')
const { Recipe, Comment } = require('../models')

const router = express.Router()

const COMPARE_ATTRIBUTES = [
  'id', 'title', 'description', 'category', 'difficulty',
  'servings', 'cookTime', 'coverImage',
  'nutrition', 'ingredients', 'steps',
  'season', 'favoriteCount', 'commentCount', 'viewCount'
  // 注意：avgRating, ratingCount, qualityScore, qualityLabel 未在 MariaDB 表结构中存在
]

function parseJSONField(val, fallback = null) {
  if (!val) return fallback
  try {
    return typeof val === 'string' ? JSON.parse(val) : val
  } catch {
    return fallback
  }
}

// POST /compare — 对比食谱
router.post('/', async (req, res) => {
  try {
    const { recipeIds } = req.body

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length < 2) {
      return res.status(400).json({
        code: 400,
        message: '请提供至少 2 个食谱 ID 进行对比',
        data: null
      })
    }

    if (recipeIds.length > 3) {
      return res.status(400).json({
        code: 400,
        message: '一次最多对比 3 个食谱',
        data: null
      })
    }

    const recipes = await Recipe.findAll({
      where: { id: recipeIds },
      attributes: COMPARE_ATTRIBUTES
    })

    if (recipes.length < 2) {
      return res.status(404).json({
        code: 404,
        message: '未找到足够的食谱进行对比',
        data: null
      })
    }

    // 批量查询 Comment 4 维字段
    const comments = await Comment.findAll({
      where: { recipeId: recipeIds },
      attributes: ['recipeId', 'taste', 'difficulty', 'presentation', 'value']
    })

    // 内存聚合 dimensionAverages
    const dimAverages = aggregateDimensionAverages(comments, recipeIds)

    // 构建对比数据
    const compareData = recipes.map(r => {
      const d = r.toJSON()
      return {
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        difficulty: d.difficulty,
        servings: d.servings,
        cookTime: d.cookTime,
        coverImage: d.coverImage,
        nutrition: parseJSONField(d.nutrition),
        ingredients: parseJSONField(d.ingredients, []),
        steps: parseJSONField(d.steps, []),
        season: d.season,
        qualityScore: d.qualityScore,
        qualityLabel: d.qualityLabel,
        avgRating: d.avgRating,
        favoriteCount: d.favoriteCount,
        commentCount: d.commentCount,
        viewCount: d.viewCount,
        dimensionAverages: dimAverages[d.id] || {
          taste: { average: 0, count: 0 },
          difficulty: { average: 0, count: 0 },
          presentation: { average: 0, count: 0 },
          value: { average: 0, count: 0 }
        }
      }
    })

    // 计算差异摘要
    const difficulties = [...new Set(compareData.map(r => r.difficulty))]
    const categories = [...new Set(compareData.map(r => r.category))]
    const allDifferent = difficulties.length === compareData.length

    // 共有食材
    const allIngredientNames = compareData.map(r =>
      (r.ingredients || []).map((i) => (i.name || '').trim().toLowerCase())
    )
    const commonIngredientNames = allIngredientNames.reduce((common, names) =>
      common.filter(n => names.includes(n)),
      allIngredientNames[0] || []
    )

    // 每道食谱的独特食材
    const uniqueIngredients = compareData.map((r, idx) => {
      const myNames = new Set(allIngredientNames[idx])
      const otherNames = new Set(allIngredientNames.flatMap((names, i) =>
        i === idx ? [] : names
      ))
      return (r.ingredients || []).filter((i) => !otherNames.has((i.name || '').trim().toLowerCase()))
    })

    return res.status(200).json({
      code: 0,
      message: 'ok',
      data: {
        recipes: compareData,
        summary: {
          totalCompared: compareData.length,
          difficulties,
          categories,
          allDifferentDifficulty: allDifferent,
          hasCommonDifficulty: !allDifferent,
          commonIngredientCount: commonIngredientNames.length,
          commonIngredients: commonIngredientNames.slice(0, 10),
          recipeIngredients: uniqueIngredients.map((list, idx) => ({
            recipeId: compareData[idx].id,
            uniqueCount: list.length,
            uniqueIngredients: list.slice(0, 8).map((i) => i.name)
          }))
        }
      }
    })
  } catch (err) {
    console.error('[POST /compare] Error:', err)
    return res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    })
  }
})

/**
 * 批量聚合评论 4 维评分 → dimensionAverages
 * @param {Array} comments - Comment 实例数组，每条含 { recipeId, taste, difficulty, presentation, value }
 * @param {string[]} recipeIds - 目标食谱 ID 列表
 * @returns {Object} { [recipeId]: { taste: {average,count}, difficulty: {average,count}, presentation: {average,count}, value: {average,count} } }
 */
function aggregateDimensionAverages(comments, recipeIds) {
  const accum = {}
  for (const id of recipeIds) {
    accum[id] = {
      taste: { sum: 0, count: 0 },
      difficulty: { sum: 0, count: 0 },
      presentation: { sum: 0, count: 0 },
      value: { sum: 0, count: 0 }
    }
  }

  for (const c of comments) {
    const rid = String(c.recipeId)
    if (!accum[rid]) continue
    for (const dim of ['taste', 'difficulty', 'presentation', 'value']) {
      if (c[dim] != null) {
        accum[rid][dim].sum += c[dim]
        accum[rid][dim].count += 1
      }
    }
  }

  const result = {}
  for (const id of recipeIds) {
    result[id] = {}
    for (const dim of ['taste', 'difficulty', 'presentation', 'value']) {
      const { sum, count } = accum[id][dim]
      result[id][dim] = {
        average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
        count
      }
    }
  }
  return result
}

module.exports = { router, aggregateDimensionAverages }