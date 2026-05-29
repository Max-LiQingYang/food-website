'use strict'

/**
 * routes/feed.js
 * 动态流路由
 *
 * GET /api/feed                    — 获取关注用户的动态流（需认证）
 * GET /api/users/:id/activities    — 获取指定用户的活动记录
 */

const express = require('express')
const { Activity, Follow, User, Recipe, Comment } = require('../models')
const auth = require('../middleware/auth')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const USER_ATTRS = ['id', 'username', 'nickname', 'avatar']

// 动态流显示的活动类型（排除 follow 类型，Feed 中不展示关注动态）
const FEED_ACTIVITY_TYPES = ['create_recipe', 'comment', 'favorite', 'review', 'work']

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

    // 查询关注用户的最近活动（排除 follow 类型）
    const { count, rows } = await Activity.findAndCountAll({
      where: {
        userId: { [Op.in]: followingIds },
        type: { [Op.in]: FEED_ACTIVITY_TYPES }
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize,
      distinct: true
    })

    // 获取活动用户信息
    const activityUserIds = [...new Set(rows.map(r => r.userId))]
    const users = await User.findAll({
      where: { id: { [Op.in]: activityUserIds } },
      attributes: USER_ATTRS
    })
    const userMap = {}
    for (const u of users) userMap[u.id] = u

    // ── 收集食谱信息 ──
    // 直接关联食谱的活动（targetType === 'recipe'）
    const directRecipeIds = rows
      .filter(r => r.targetType === 'recipe' && r.targetId)
      .map(r => r.targetId)

    // work 类型的活动需要通过 comment 间接获取 recipeId
    const workActivities = rows.filter(r => r.type === 'work' && r.targetId)
    let commentRecipeMap = {}
    if (workActivities.length > 0) {
      const commentIds = workActivities.map(a => a.targetId)
      const comments = await Comment.findAll({
        where: { id: { [Op.in]: commentIds } },
        attributes: ['id', 'recipeId']
      })
      // commentId → recipeId
      const c2r = {}
      const indirectRecipeIds = []
      for (const c of comments) {
        c2r[c.id] = c.recipeId
        if (c.recipeId) indirectRecipeIds.push(c.recipeId)
      }

      if (indirectRecipeIds.length > 0) {
        const recipes = await Recipe.findAll({
          where: { id: { [Op.in]: indirectRecipeIds } },
          attributes: ['id', 'title', 'coverImage']
        })
        for (const r of recipes) {
          commentRecipeMap[r.id] = { title: r.title, coverImage: r.coverImage }
        }
      }
      // 将 commentId → recipeId 映射暂存，后续构建时使用
      for (const a of workActivities) {
        a._commentRecipeId = c2r[a.targetId] || null
      }
    }

    // 批量查询所有直接关联的食谱
    let recipeMap = {}
    const allDirectIds = [...new Set(directRecipeIds)]
    if (allDirectIds.length > 0) {
      const recipes = await Recipe.findAll({
        where: { id: { [Op.in]: allDirectIds } },
        attributes: ['id', 'title', 'coverImage']
      })
      for (const r of recipes) {
        recipeMap[r.id] = { title: r.title, coverImage: r.coverImage }
      }
    }

    // 解析 extra JSON 并附加 recipeInfo
    const list = rows.map(r => {
      const item = r.toJSON()
      item.user = userMap[r.userId] || null

      // 解析 extra
      try {
        item.extra = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra
      } catch {
        item.extra = null
      }

      // 附加食谱信息
      if (r.type === 'work') {
        // work 类型通过 comment → recipe 获取
        const rid = r._commentRecipeId
        item.recipeInfo = rid && commentRecipeMap[rid]
          ? commentRecipeMap[rid]
          : (item.extra?.recipeTitle ? { title: item.extra.recipeTitle, coverImage: null } : null)
      } else if (r.targetType === 'recipe' && r.targetId) {
        item.recipeInfo = recipeMap[r.targetId] || null
      } else {
        item.recipeInfo = null
      }

      // 清理临时属性
      delete item._commentRecipeId
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