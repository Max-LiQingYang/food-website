'use strict'

/**
 * routes/dailyPick.js
 * 每日食谱推荐
 *
 * GET /api/recipes/daily-pick        — 当日推荐（基于日期种子）
 * GET /api/recipes/daily-pick?random=1 — 随机推荐
 */

const crypto = require('crypto')
const express = require('express')
const { Recipe } = require('../models')
const { Op, fn, col } = require('sequelize')

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

module.exports = router
