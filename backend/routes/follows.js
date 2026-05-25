'use strict'

/**
 * routes/follows.js
 * 用户关注路由
 *
 * POST   /api/users/:id/follow         — 关注用户（需认证）
 * DELETE /api/users/:id/follow         — 取消关注（需认证）
 * GET    /api/users/:id/followers      — 粉丝列表
 * GET    /api/users/:id/following      — 关注列表
 *
 * 路由前缀由 routes/index.js 挂载为 /api/users
 * 所有端点验证目标用户存在
 */

const express = require('express')
const { User, Follow } = require('../models')
const auth = require('../middleware/auth')
const { createActivity } = require('../utils/activity')
const { createNotification } = require('../utils/notificationHelper')
const { checkAllAchievements } = require('../utils/achievementChecker')
const { Op } = require('sequelize')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const USER_LIST_ATTRS = ['id', 'username', 'nickname', 'createdAt']

// ─────────────────────────────────────────────────────────────────
// POST /api/users/:id/follow — 关注用户
// ─────────────────────────────────────────────────────────────────
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const followingId = req.params.id
    const followerId = req.userId

    if (followerId === followingId) {
      return res.status(400).json(resJSON(400, '不能关注自己', null))
    }

    // 检查目标用户是否存在
    const targetUser = await User.findByPk(followingId, {
      attributes: ['id', 'username']
    })
    if (!targetUser) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    // 检查是否已关注
    const existing = await Follow.findOne({
      where: { followerId, followingId }
    })
    if (existing) {
      return res.status(200).json(resJSON(0, '已关注该用户', { followed: true }))
    }

    await Follow.create({ followerId, followingId })

    createActivity(followerId, 'follow', followingId, 'user', {
      targetUsername: targetUser.username
    })

    // 通知被关注用户 + 成就检查（不阻塞）
    setImmediate(() => {
      User.findByPk(followerId, { attributes: ['id', 'nickname', 'username'] }).then(follower => {
        const name = (follower && (follower.nickname || follower.username)) || '某用户'
        createNotification({
          userId: followingId,
          type: 'follow',
          actorId: followerId,
          message: name + ' 关注了你',
          link: '/user/' + followerId,
          targetId: followerId,
          targetType: 'user'
        }).catch(err => console.error('[follow notif err]', err))
      }).catch(err => console.error('[follow notif lookup err]', err))

      checkAllAchievements(followerId, ['social-butterfly']).catch(err => {
        console.error('[follow achievement err]', err)
      })
      checkAllAchievements(followingId, ['social-butterfly']).catch(err => {
        console.error('[follow achievement err2]', err)
      })
    })

    return res.status(201).json(resJSON(0, 'ok', { followed: true }))
  } catch (err) {
    console.error('[POST /users/:id/follow] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/users/:id/follow — 取消关注
// ─────────────────────────────────────────────────────────────────
router.delete('/:id/follow', auth, async (req, res) => {
  try {
    const followingId = req.params.id
    const followerId = req.userId

    const existing = await Follow.findOne({
      where: { followerId, followingId }
    })
    if (!existing) {
      return res.status(404).json(resJSON(404, '未关注该用户', null))
    }

    await existing.destroy()

    return res.status(200).json(resJSON(0, 'ok', { followed: false }))
  } catch (err) {
    console.error('[DELETE /users/:id/follow] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/followers — 粉丝列表
// ─────────────────────────────────────────────────────────────────
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params
    let page = Math.max(1, parseInt(req.query.page, 10) || 1)
    let pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Follow.findAndCountAll({
      where: { followingId: id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    // 获取对应的用户信息
    const followerIds = rows.map(r => r.followerId)
    const followers = followerIds.length > 0
      ? await User.findAll({
          where: { id: { [Op.in]: followerIds } },
          attributes: USER_LIST_ATTRS
        })
      : []

    const userMap = {}
    for (const u of followers) userMap[u.id] = u

    const list = rows.map(r => ({
      ...(userMap[r.followerId] ? userMap[r.followerId].toJSON() : {}),
      followedAt: r.createdAt
    })).filter(Boolean)

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize })
    )
  } catch (err) {
    console.error('[GET /users/:id/followers] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/following — 关注列表
// ─────────────────────────────────────────────────────────────────
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params
    let page = Math.max(1, parseInt(req.query.page, 10) || 1)
    let pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize

    const user = await User.findByPk(id, { attributes: ['id'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const { count, rows } = await Follow.findAndCountAll({
      where: { followerId: id },
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    const followingIds = rows.map(r => r.followingId)
    const followingUsers = followingIds.length > 0
      ? await User.findAll({
          where: { id: { [Op.in]: followingIds } },
          attributes: USER_LIST_ATTRS
        })
      : []

    const userMap = {}
    for (const u of followingUsers) userMap[u.id] = u

    const list = rows.map(r => ({
      ...(userMap[r.followingId] ? userMap[r.followingId].toJSON() : {}),
      followedAt: r.createdAt
    })).filter(Boolean)

    return res.status(200).json(
      resJSON(0, 'ok', { list, total: count, page, pageSize })
    )
  } catch (err) {
    console.error('[GET /users/:id/following] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /api/users/:id/follow-status — 获取关注状态（需认证）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/follow-status', auth, async (req, res) => {
  try {
    const followingId = req.params.id
    const followerId = req.userId

    if (followerId === followingId) {
      return res.json(resJSON(0, 'ok', { isFollowing: false }))
    }

    const existing = await Follow.findOne({
      where: { followerId, followingId }
    })

    return res.json(resJSON(0, 'ok', { isFollowing: !!existing }))
  } catch (err) {
    console.error('[GET /users/:id/follow-status] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router