'use strict'

/**
 * routes/behaviors.js
 * 用户行为分析追踪 — 事件记录 / 历史查询 / 行为推荐权重
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { BehaviorEvent, Recipe } = require('../models')
const auth = require('../middleware/auth')

// POST /api/behaviors/track — 记录用户行为事件
router.post('/behaviors/track', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { eventType, recipeId, metadata } = req.body

    if (!eventType || !recipeId) {
      return res.status(400).json({ code: 400, message: 'eventType 和 recipeId 必填' })
    }

    const validTypes = ['view', 'favorite', 'cook', 'share']
    if (!validTypes.includes(eventType)) {
      return res.status(400).json({ code: 400, message: `eventType 必须为: ${validTypes.join(', ')}` })
    }

    // 避免重复 view 记录（同用户同食谱 5 分钟内->更新 timestamp 不新增）
    const FIVE_MIN = 5 * 60 * 1000
    if (eventType === 'view') {
      const recent = await BehaviorEvent.findOne({
        where: {
          userId,
          recipeId,
          eventType: 'view',
          timestamp: { [Op.gte]: new Date(Date.now() - FIVE_MIN) },
        },
        order: [['timestamp', 'DESC']],
      })
      if (recent) {
        await recent.update({ timestamp: new Date() })
        return res.json({ code: 0, message: 'ok', deduped: true })
      }
    }

    const event = await BehaviorEvent.create({
      userId,
      eventType,
      recipeId,
      metadata: metadata || null,
      timestamp: new Date(),
    })

    res.json({ code: 0, message: 'ok', eventId: event.id })
  } catch (err) {
    console.error('[POST /behaviors/track] error:', err.message)
    res.status(500).json({ code: 500, message: '记录行为失败' })
  }
})

// POST /api/behaviors/track-anonymous — 匿名行为追踪
router.post('/behaviors/track-anonymous', async (req, res) => {
  try {
    const { eventType, recipeId, metadata } = req.body
    if (!eventType || !recipeId) {
      return res.status(400).json({ code: 400, message: 'eventType 和 recipeId 必填' })
    }
    const validTypes = ['view', 'share']
    if (!validTypes.includes(eventType)) {
      return res.status(400).json({ code: 400, message: `匿名追踪仅支持: ${validTypes.join(', ')}` })
    }

    await BehaviorEvent.create({
      userId: 'anonymous',
      eventType,
      recipeId,
      metadata: metadata || null,
      timestamp: new Date(),
    })

    res.json({ code: 0, message: 'ok' })
  } catch (err) {
    console.error('[POST /behaviors/track-anonymous] error:', err.message)
    res.status(500).json({ code: 500, message: '记录行为失败' })
  }
})

// GET /api/behaviors/history — 获取用户行为历史
router.get('/behaviors/history', auth, async (req, res) => {
  try {
    const userId = req.user.id
    const { limit = 50, offset = 0, eventType } = req.query

    const where = { userId }
    if (eventType) where.eventType = eventType

    const { rows, count } = await BehaviorEvent.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      offset: parseInt(offset, 10) || 0,
    })

    // 收集唯一 recipeId
    const recipeIds = [...new Set(rows.map(r => r.recipeId))]
    const recipes = await Recipe.findAll({
      where: { id: { [Op.in]: recipeIds } },
      attributes: ['id', 'title', 'coverImage', 'category', 'difficulty', 'cookTime'],
    })
    const recipeMap = {}
    recipes.forEach(r => { recipeMap[r.id] = r })

    const list = rows.map(event => ({
      id: event.id,
      eventType: event.eventType,
      recipeId: event.recipeId,
      timestamp: event.timestamp,
      recipe: recipeMap[event.recipeId] || null,
    }))

    res.json({ code: 0, data: { list, total: count } })
  } catch (err) {
    console.error('[GET /behaviors/history] error:', err.message)
    res.status(500).json({ code: 500, message: '获取行为历史失败' })
  }
})

// GET /api/behaviors/stats — 用户行为统计
router.get('/behaviors/stats', auth, async (req, res) => {
  try {
    const userId = req.user.id

    const [viewCount, favoriteCount, cookCount, shareCount] = await Promise.all([
      BehaviorEvent.count({ where: { userId, eventType: 'view' } }),
      BehaviorEvent.count({ where: { userId, eventType: 'favorite' } }),
      BehaviorEvent.count({ where: { userId, eventType: 'cook' } }),
      BehaviorEvent.count({ where: { userId, eventType: 'share' } }),
    ])

    res.json({
      code: 0,
      data: {
        viewCount,
        favoriteCount,
        cookCount,
        shareCount,
        total: viewCount + favoriteCount + cookCount + shareCount,
      },
    })
  } catch (err) {
    console.error('[GET /behaviors/stats] error:', err.message)
    res.status(500).json({ code: 500, message: '获取行为统计失败' })
  }
})

module.exports = router