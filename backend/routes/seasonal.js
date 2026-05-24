'use strict'

/**
 * routes/seasonal.js
 * 季节性食谱推荐
 * 
 * GET / — 根据季节参数返回应季食谱
 * 参数: ?season=spring|summer|autumn|winter（可选，默认根据当前月份推断）
 */

const express = require('express')
const router = express.Router()
const { Recipe } = require('../models')
const { Op } = require('sequelize')

/**
 * 通用响应封装
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * LIST_ATTRIBUTES（不含 ingredients/steps，节省带宽）
 */
const LIST_ATTRIBUTES = [
  'id',
  'title',
  'coverImage',
  'author',
  'cookTime',
  'description',
  'category',
  'categoryTags',
  'servings',
  'difficulty',
  'userId',
  'createdAt',
  'updatedAt',
  'nutrition',
  'tips',
  'season',
  'favoriteCount',
  'commentCount',
  'isFeatured',
  'viewCount',
]

/**
 * 根据月份推断季节
 */
function guessSeason() {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/**
 * 获取季节中文标签
 */
function seasonLabel(season) {
  const labels = {
    spring: '🌺 春季',
    summer: '☀️ 夏季',
    autumn: '🍂 秋季',
    winter: '❄️ 冬季',
  }
  return labels[season] || season
}

router.get('/', async (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=600',
    Vary: 'Accept-Encoding',
  })

  try {
    const season = req.query.season || guessSeason()
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 20)

    // 查询匹配当前季节或四季皆宜的食谱
    const recipes = await Recipe.findAll({
      where: {
        [Op.or]: [
          { season },
          { season: 'all' },
        ],
      },
      order: [['favoriteCount', 'DESC']],
      limit,
      attributes: LIST_ATTRIBUTES,
    })

    const list = recipes.map(r => r.toJSON())

    // 附加质量评分
    const { attachRatingInfo } = require('./recipes')
    if (typeof attachRatingInfo === 'function') {
      await attachRatingInfo(list)
    }

    return res.status(200).json(
      resJSON(0, 'ok', {
        list,
        season,
        seasonLabel: seasonLabel(season),
        total: list.length,
      })
    )
  } catch (err) {
    console.error('[GET /seasonal] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router