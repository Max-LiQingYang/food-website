'use strict'

/**
 * routes/notification.js
 * 通知系统路由
 *
 * GET  /              — 获取当前用户通知列表（分页、按时间倒序）
 * GET  /unread-count  — 获取未读通知数量
 * PUT  /:id/read      — 标记单条通知为已读
 * PUT  /read-all      — 标记所有通知为已读
 * DELETE /:id         — 删除通知
 */

const express = require('express')
const { Notification } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户通知列表（分页、按时间倒序）
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20))
    const offset = (page - 1) * pageSize
    const userId = req.userId

    const whereClause = { userId }
    // 过滤通知类型
    if (req.query.type) {
      whereClause.type = req.query.type
    }
    // 只显示未读
    if (req.query.unread === 'true' || req.query.unread === '1') {
      whereClause.isRead = false
    }

    const { rows, count } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      offset,
      limit: pageSize
    })

    const unreadCount = await Notification.count({
      where: { userId, isRead: false }
    })

    return res.status(200).json(resJSON(0, 'ok', {
      list: rows,
      total: count,
      page,
      pageSize,
      unreadCount
    }))
  } catch (err) {
    console.error('[GET /notifications] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /unread-count — 获取未读通知数量
// ─────────────────────────────────────────────────────────────────
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { userId: req.userId, isRead: false }
    })
    return res.status(200).json(resJSON(0, 'ok', { count }))
  } catch (err) {
    console.error('[GET /unread-count] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id/read — 标记单条通知为已读
// ─────────────────────────────────────────────────────────────────
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!notification) {
      return res.status(404).json(resJSON(404, '通知不存在', null))
    }
    await notification.update({ isRead: true })
    return res.status(200).json(resJSON(0, 'ok', notification))
  } catch (err) {
    console.error('[PUT /notifications/:id/read] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /read-all — 标记所有通知为已读
// ─────────────────────────────────────────────────────────────────
router.put('/read-all', auth, async (req, res) => {
  try {
    const [affected] = await Notification.update(
      { isRead: true },
      { where: { userId: req.userId, isRead: false } }
    )
    return res.status(200).json(resJSON(0, 'ok', { affected }))
  } catch (err) {
    console.error('[PUT /notifications/read-all] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除通知
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, userId: req.userId }
    })
    if (!notification) {
      return res.status(404).json(resJSON(404, '通知不存在', null))
    }
    await notification.destroy()
    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /notifications/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router