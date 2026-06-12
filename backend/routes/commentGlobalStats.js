'use strict'

/**
 * routes/commentGlobalStats.js
 * 全站评论维度统计（API-5，ARCH §1.6）
 *
 * GET /api/comments/global-stats
 *   返回全站 4 维平均分 + 全站总评分次数 + 全站有效评分数
 *   进程内 LRU 缓存：key=`site:dimAverages`，TTL=1h
 *
 * 用途：API-1（用户 summary）内联调用或独立调用，注入 siteAverage 字段
 * 数据：Comment 表全表聚合（无 userId 过滤）
 */

const express = require('express')
const { Comment } = require('../models')
const { fn, col, literal } = require('sequelize')
const cache = require('../utils/cache')

const router = express.Router()

/** 4 维字段名（与 Comment 模型保持一致） */
const DIMENSION_FIELDS = ['taste', 'difficulty', 'presentation', 'value']

/** 缓存 key（ARCH §1.7.2） */
const CACHE_KEY = 'site:dimAverages'

/** 缓存 TTL：1 小时（ARCH §1.7.2） */
const CACHE_TTL_MS = 60 * 60 * 1000

function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 计算全站维度平均（无缓存）
 * 单次 findAll 拉所有有任一维度评分的评论，内存计算
 * 注：696+ 条数据规模下，单次拉取 < 5ms；如未来增长到 10w+ 可改为聚合 SQL
 * @returns {Promise<{dimAverages: object, totalComments: number, totalValidDimensions: number}>}
 */
async function computeGlobalStats() {
  // 仅拉取有 4 维任一评分的评论（NULL 不计入平均）
  const comments = await Comment.findAll({
    where: {
      [require('sequelize').Op.or]: DIMENSION_FIELDS.map(d => ({ [d]: { [require('sequelize').Op.ne]: null } }))
    },
    attributes: DIMENSION_FIELDS
  })

  const dimAverages = {}
  for (const dim of DIMENSION_FIELDS) {
    const valid = comments.filter(c => c[dim] != null)
    if (valid.length > 0) {
      const sum = valid.reduce((s, c) => s + c[dim], 0)
      dimAverages[dim] = {
        average: Math.round((sum / valid.length) * 10) / 10,
        count: valid.length
      }
    } else {
      dimAverages[dim] = { average: 0, count: 0 }
    }
  }

  // 顺便统计总评分数（含只有 overall 没有 4 维的旧评论）
  const totalComments = await Comment.count({ where: { rating: { [require('sequelize').Op.ne]: null } } })

  return {
    dimAverages,
    totalRatings: totalComments,
    validDimensionRatings: comments.length,
    computedAt: new Date().toISOString()
  }
}

/**
 * GET /api/comments/global-stats
 * 返回全站 4 维平均分等数据
 */
router.get('/global-stats', async (req, res) => {
  try {
    // 命中缓存直接返回
    const cached = cache.get(CACHE_KEY)
    if (cached) {
      res.set('X-Cache', 'HIT')
      return res.status(200).json(resJSON(0, 'ok', cached))
    }

    // 缓存 miss → 走 DB
    const stats = await computeGlobalStats()
    cache.set(CACHE_KEY, stats, CACHE_TTL_MS)
    res.set('X-Cache', 'MISS')
    return res.status(200).json(resJSON(0, 'ok', stats))
  } catch (err) {
    console.error('[GET /api/comments/global-stats] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router
// 同时导出 computeGlobalStats 供 userRatings.js 内部 inline 调用
module.exports.computeGlobalStats = computeGlobalStats
module.exports.CACHE_KEY = CACHE_KEY
module.exports.CACHE_TTL_MS = CACHE_TTL_MS
