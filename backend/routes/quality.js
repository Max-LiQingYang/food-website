'use strict'

/**
 * routes/quality.js
 * 食谱质量评分详情 — 食材完整度 / 步骤清晰度 / 营养信息完整度
 *
 * 多维评分逻辑：
 *   ingredientCompleteness: 基于 ingredients JSON 数组长度和描述丰富度
 *   stepClarity: 基于 steps 数组长度、步骤描述字数、是否有时间标注
 *   nutritionInfo: 基于 nutrition JSON 字段覆盖率（蛋白/纤维/钠/脂肪/热量）
 */

const express = require('express')
const router = express.Router()
const { Recipe } = require('../models')

// 计算食材完整度
function computeIngredientCompleteness(recipe) {
  if (!recipe.ingredients) return { score: 0, maxScore: 10, detail: '无食材列表' }

  let ingredients = recipe.ingredients
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return { score: 0, maxScore: 10, detail: '食材列表为空' }
  }

  let score = 0
  const count = ingredients.length

  // 食材数量评分（最多 5 分）
  score += Math.min(count, 10) * 0.5

  // 食材描述丰富度（最多 3 分）
  const richIngredients = ingredients.filter(i => {
    const name = typeof i === 'string' ? i : (i.name || i.ingredient || '')
    return name.length > 2
  })
  score += Math.min(richIngredients.length / Math.max(count, 1) * 3, 3)

  // 食材数量范围评分（至少 2 种得 1 分，至少 5 种得额外 1 分）
  if (count >= 2) score += 1
  if (count >= 5) score += 1

  return {
    score: Math.round(score * 10) / 10,
    maxScore: 10,
    detail: `${count} 种食材`,
    ingredientCount: count,
    hasRichDesc: richIngredients.length > 0,
  }
}

// 计算步骤清晰度
function computeStepClarity(recipe) {
  if (!recipe.steps) return { score: 0, maxScore: 10, detail: '无烹饪步骤' }

  let steps = recipe.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    return { score: 0, maxScore: 10, detail: '步骤列表为空' }
  }

  let score = 0
  const count = steps.length
  const timePattern = /\d+\s*(分钟|小时|min|h|分钟|秒)/i
  const detailPattern = /(中火|小火|大火|焯水|腌制|翻面|切|煮|炒|煎|炸|蒸|烤|炖|焖|熬)/

  // 步骤数量评分（最多 3 分，3 步以上才合理）
  score += Math.min(count, 8) * 0.3
  if (count >= 3) score += 0.5
  if (count >= 5) score += 0.5

  // 步骤描述质量（每个步骤平均字数，最多 3 分）
  let totalWords = 0
  let hasTime = 0
  let hasDetail = 0

  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    totalWords += text.length
    if (timePattern.test(text)) hasTime++
    if (detailPattern.test(text)) hasDetail++
  })

  const avgWords = totalWords / Math.max(count, 1)

  // 平均描述长度（最多 3 分）
  score += Math.min(avgWords / 20, 3)

  // 时间标注率（最多 2 分）
  score += Math.min(hasTime / Math.max(count, 1) * 2, 2)

  // 动作词覆盖率（最多 1 分）
  score += Math.min(hasDetail / Math.max(count, 1), 1)

  return {
    score: Math.round(score * 10) / 10,
    maxScore: 10,
    detail: `${count} 步，平均 ${Math.round(avgWords)} 字/步`,
    stepCount: count,
    stepsWithTime: hasTime,
    stepsWithDetail: hasDetail,
  }
}

// 计算营养信息完整度
function computeNutritionInfo(recipe) {
  if (!recipe.nutrition) return { score: 0, maxScore: 10, detail: '无营养信息' }

  let nutrition = recipe.nutrition
  if (!nutrition || typeof nutrition !== 'object') {
    return { score: 0, maxScore: 10, detail: '营养格式异常' }
  }

  // 检查 5 项基础营养
  const fields = [
    { key: 'calories', label: '热量', weight: 2 },
    { key: 'protein', label: '蛋白质', weight: 2 },
    { key: 'fat', label: '脂肪', weight: 2 },
    { key: 'fiber', label: '纤维', weight: 2 },
    { key: 'sodium', label: '钠', weight: 2 },
  ]

  let score = 0
  const filled = []
  const missing = []

  fields.forEach(f => {
    const val = nutrition[f.key]
    if (val !== null && val !== undefined && val !== '' && val !== 0) {
      score += f.weight
      filled.push(f.label)
    } else {
      missing.push(f.label)
    }
  })

  return {
    score,
    maxScore: 10,
    detail: `${filled.length}/5 项已填写`,
    filledCount: filled.length,
    totalCount: 5,
    filled: filled.join('、'),
    missing: missing.join('、') || '无',
  }
}

// 计算综合质量评分
function computeQualityScore(recipe) {
  const ingredient = computeIngredientCompleteness(recipe)
  const step = computeStepClarity(recipe)
  const nutrition = computeNutritionInfo(recipe)

  // 加权计算总分
  const totalScore = Math.round(
    (ingredient.score / ingredient.maxScore) * 3.5 +
    (step.score / step.maxScore) * 4 +
    (nutrition.score / nutrition.maxScore) * 2.5
  )

  let label = '差'
  if (totalScore >= 9) label = '优秀'
  else if (totalScore >= 7) label = '良好'
  else if (totalScore >= 5) label = '一般'
  else if (totalScore >= 3) label = '较差'

  return {
    overall: { score: totalScore, maxScore: 10, label },
    ingredientCompleteness: ingredient,
    stepClarity: step,
    nutritionInfo: nutrition,
  }
}

// GET /api/recipes/:id/quality-details — 质量评分详情
router.get('/recipes/:id/quality-details', async (req, res) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'ingredients', 'steps', 'nutrition', 'qualityScore'],
    })

    if (!recipe) {
      return res.status(404).json({ code: 404, message: '食谱不存在' })
    }

    const details = computeQualityScore(recipe)

    res.json({
      code: 0,
      data: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ...details,
      },
    })
  } catch (err) {
    console.error('[GET /quality-details] error:', err.message)
    res.status(500).json({ code: 500, message: '获取质量评分失败' })
  }
})

// 导出计算函数供测试使用
module.exports = router
module.exports.computeIngredientCompleteness = computeIngredientCompleteness
module.exports.computeStepClarity = computeStepClarity
module.exports.computeNutritionInfo = computeNutritionInfo
module.exports.computeQualityScore = computeQualityScore