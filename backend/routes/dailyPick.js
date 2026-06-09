'use strict'

/**
 * routes/dailyPick.js
 * 每日食谱推荐
 *
 * GET /api/recipes/daily-pick              — 当日推荐（基于日期种子）
 * GET /api/recipes/daily-pick?random=1     — 随机推荐
 * GET /api/recipes/daily-pick/personalized — 个性化推荐（需认证）
 */

const crypto = require('crypto')
const express = require('express')
const { Recipe, Favorite } = require('../models')
const { Op, fn, col } = require('sequelize')
const auth = require('../middleware/auth')

const router = express.Router()

// ── 工具函数 ──

/**
 * 判断当前季节
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/**
 * 生成当日种子（按日期哈希，保证同一天返回相同结果）
 */
function getDailySeed(random = false) {
  const seed = random ? Date.now().toString() : new Date().toDateString()
  return crypto.createHash('md5').update(seed).digest('hex')
}

/**
 * 按种子确定性打乱数组
 */
function seededShuffle(items, seed) {
  return items
    .map(item => ({
      item,
      sortKey: crypto.createHash('md5').update(seed + item.id).digest('hex')
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(x => x.item)
}

/**
 * 安全解析 JSON 字段
 */
function safeParse(str) {
  if (!str) return null
  try { return typeof str === 'string' ? JSON.parse(str) : str } catch { return null }
}

/**
 * 生成推荐理由
 */
function generateReason(reasonType) {
  const reasons = {
    cuisine: '🍜 你喜欢的菜系',
    ingredient: '🥘 你常用的食材',
    flavor: '👅 符合你的口味',
    method: '🔪 你偏好的做法',
    seasonal: '🌿 当季推荐',
    popular: '🔥 热门食谱',
    diversity: '🎯 换个口味',
  }
  return reasons[reasonType] || '🌟 为你推荐'
}

// ── 路由 ──

router.get('/daily-pick', async (req, res) => {
  try {
    const currentSeason = getCurrentSeason()
    const isRandom = req.query.random === '1'

    // 查询所有食谱
    const recipes = await Recipe.findAll({
      attributes: [
        'id', 'title', 'description', 'coverImage', 'cookTime',
        'category', 'difficulty', 'servings', 'season',
        'story', 'culturalBackground', 'tips',
        'isFeatured', 'favoriteCount', 'viewCount',
        'createdAt', 'updatedAt'
      ]
    })

    if (!recipes.length) {
      return res.status(200).json({ code: 0, message: '暂无食谱', data: null })
    }

    // 1. 按优先级分组排序
    //   — 应季优先
    //   — 编辑精选优先
    //   — 收藏数降序
    const sorted = [...recipes].sort((a, b) => {
      // 季节匹配优先
      const aSeasonMatch = a.season === currentSeason ? 1 : 0
      const bSeasonMatch = b.season === currentSeason ? 1 : 0
      if (bSeasonMatch !== aSeasonMatch) return bSeasonMatch - aSeasonMatch

      // 编辑精选优先
      const aFeatured = a.isFeatured ? 1 : 0
      const bFeatured = b.isFeatured ? 1 : 0
      if (bFeatured !== aFeatured) return bFeatured - aFeatured

      // 收藏数降序
      return (b.favoriteCount || 0) - (a.favoriteCount || 0)
    })

    // 2. 确定性随机打乱（保证同一天/同一种子返回可复现结果）
    const seed = getDailySeed(isRandom)
    const shuffled = seededShuffle(sorted, seed)

    // 3. 取第一条
    const pick = shuffled[0]

    return res.status(200).json({
      code: 0,
      message: 'success',
      data: pick
    })
  } catch (err) {
    console.error('[GET /api/recipes/daily-pick] Error:', err)
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

// ── 个性化推荐（需认证） ──
router.get('/daily-pick/personalized', auth, async (req, res) => {
  try {
    const currentSeason = getCurrentSeason()
    const userId = req.userId

    // 1. 获取用户收藏的食谱
    const favorites = await Favorite.findAll({
      where: { userId },
      include: [{
        model: Recipe,
        as: 'recipe',
        attributes: ['id', 'category', 'categoryTags', 'season', 'favoriteCount', 'viewCount']
      }],
      limit: 50,
      order: [['createdAt', 'DESC']]
    })

    // 2. 构建用户偏好向量
    const preferenceVector = {
      ingredient: {},
      cuisine: {},
      flavor: {},
      method: {},
      price: {},
    }

    for (const fav of favorites) {
      if (!fav.recipe) continue
      const tags = safeParse(fav.recipe.categoryTags)
      if (!tags) continue

      for (const dim of ['ingredient', 'cuisine', 'flavor', 'method', 'price']) {
        const values = tags[dim]
        if (Array.isArray(values)) {
          for (const v of values) {
            preferenceVector[dim][v] = (preferenceVector[dim][v] || 0) + 1
          }
        }
      }
    }

    // 3. 获取候选食谱（排除已收藏的）
    const favRecipeIds = favorites.map(f => f.recipeId)
    const candidates = await Recipe.findAll({
      where: {
        id: { [Op.notIn]: favRecipeIds }
      },
      attributes: [
        'id', 'title', 'description', 'coverImage', 'cookTime',
        'category', 'difficulty', 'servings', 'season',
        'categoryTags', 'favoriteCount', 'viewCount',
        'avgRating', 'ratingCount'
      ]
    })

    if (!candidates.length) {
      // Fallback: 返回当日推荐
      const fallbackRes = await Recipe.findAll({
        attributes: [
          'id', 'title', 'description', 'coverImage', 'cookTime',
          'category', 'difficulty', 'servings', 'season',
          'favoriteCount', 'viewCount', 'avgRating', 'ratingCount'
        ],
        limit: 3,
        order: [['favoriteCount', 'DESC']]
      })
      const results = fallbackRes.map(r => ({
        ...r.toJSON(),
        recommendReason: '🔥 热门食谱'
      }))
      return res.status(200).json({ code: 0, message: 'success', data: { list: results } })
    }

    // 4. 5 维加权评分
    const weights = { ingredient: 0.3, cuisine: 0.25, flavor: 0.2, method: 0.15, price: 0.1 }
    const scored = candidates.map(candidate => {
      const c = candidate.toJSON()
      const tags = safeParse(c.categoryTags)
      let score = 0
      let maxDim = ''
      let maxDimScore = 0

      if (tags) {
        for (const [dim, weight] of Object.entries(weights)) {
          const values = tags[dim]
          if (!Array.isArray(values) || values.length === 0) continue

          let dimScore = 0
          for (const v of values) {
            const prefCount = preferenceVector[dim][v] || 0
            if (prefCount > 0) dimScore += prefCount
          }
          if (values.length > 0) dimScore /= values.length
          const weighted = dimScore * weight
          score += weighted
          if (weighted > maxDimScore) {
            maxDimScore = weighted
            maxDim = dim
          }
        }
      }

      // 季节加权
      if (c.season === currentSeason) score += 0.2
      else if (c.season === 'all') score += 0.1

      // 热门加成
      score += ((c.favoriteCount || 0) * 0.001) + ((c.viewCount || 0) * 0.0001)

      return { recipe: c, score, reasonType: maxDim || 'popular' }
    })

    // 5. 排序 + 多样性控制
    scored.sort((a, b) => b.score - a.score)

    const selected = []
    const usedCategories = new Set()

    for (const item of scored) {
      if (selected.length >= 3) break
      // 最多 2 道同 category
      if (usedCategories.has(item.recipe.category) && [...usedCategories].filter(c => c === item.recipe.category).length >= 2) {
        continue
      }
      usedCategories.add(item.recipe.category)
      selected.push(item)
    }

    // 如果不够 3 道，补热门
    if (selected.length < 3) {
      for (const item of scored) {
        if (selected.length >= 3) break
        if (!selected.find(s => s.recipe.id === item.recipe.id)) {
          selected.push({ ...item, reasonType: 'popular' })
        }
      }
    }

    const results = selected.map(s => ({
      ...s.recipe,
      recommendReason: generateReason(s.reasonType)
    }))

    return res.status(200).json({ code: 0, message: 'success', data: { list: results } })
  } catch (err) {
    console.error('[GET /api/recipes/daily-pick/personalized] Error:', err)
    return res.status(500).json({ code: 500, message: '服务器内部错误', data: null })
  }
})

module.exports = router
