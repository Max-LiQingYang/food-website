'use strict'

/**
 * routes/feed.js
 * 动态流路由
 *
 * GET /api/feed                    — 获取关注用户的动态流（需认证）
 * GET /api/users/:id/activities    — 获取指定用户的活动记录
 */

const express = require('express')
const { Activity, Follow, User } = require('../models')
const auth = require('../middleware/auth')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const USER_ATTRS = ['id', 'username', 'nickname']

// ─────────────────────────────────────────────────────────────────
// GET /api/feed — 关注用户动态流（需认证）
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.userId
    let page = Math.max(1, parseInt(req.query.page, 10) || 1)
    let pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    // 获取关注列表
    const followRels = await Follow.findAll({
      where: { followerId: userId },
      attributes: ['followingId']
    })
    const followingIds = followRels.map(r => r.followingId)

    if (followingIds.length === 0) {
      return res.status(200).json(
        resJSON(0, 'ok', { list: [], total: 0, page, pageSize, hasMore: false })
      )
    }

    // 查询关注用户的最近活动
    const { count, rows } = await Activity.findAndCountAll({
      where: {
        userId: { [Op.in]: followingIds }
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    // 获取活动用户信息
    const activityUserIds = [...new Set(rows.map(r => r.userId))]
    const users = await User.findAll({
      where: { id: { [Op.in]: activityUserIds } },
      attributes: USER_ATTRS
    })
    const userMap = {}
    for (const u of users) userMap[u.id] = u

    // 解析 extra JSON
    const list = rows.map(r => {
      const item = r.toJSON()
      item.user = userMap[r.userId] || null
      try {
        item.extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra
      } catch {
        item.extra = null
      }
      return item
    })

    const hasMore = offset + pageSize < count

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize, hasMore })
    )
  } catch (err) {
    console.error('[GET /feed] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// Helper: 创建活动记录（供其他路由调用）
// ─────────────────────────────────────────────────────────────────
module.exports = router