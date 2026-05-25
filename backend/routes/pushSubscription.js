'use strict'

/**
 * routes/pushSubscription.js
 * Web Push 订阅管理路由
 *
 * POST   /            — 注册推送订阅
 * PUT    /:id         — 更新订阅
 * DELETE /:id         — 取消订阅
 * GET    /my          — 获取当前用户所有订阅
 */

const express = require('express')
const { PushSubscription } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// POST / — 注册推送订阅
router.post('/', auth, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json(resJSON(400, '缺少推送订阅参数', null))
    }

    // 检查是否已存在相同 endpoint
    const existing = await PushSubscription.findOne({ where: { endpoint } })
    if (existing) {
      // 更新所属用户（如果更换了账号）
      await existing.update({
        userId: req.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || existing.userAgent
      })
      return res.status(200).json(resJSON(0, 'ok', existing))
    }

    const sub = await PushSubscription.create({
      userId: req.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null
    })
    return res.status(201).json(resJSON(0, 'ok', sub))
  } catch (err) {
    console.error('[POST /push/subscription] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// GET /my — 获取当前用户所有订阅
router.get('/my', auth, async (req, res) => {
  try {
    const subs = await PushSubscription.findAll({ where: { userId: req.userId } })
    return res.status(200).json(resJSON(0, 'ok', subs))
  } catch (err) {
    console.error('[GET /push/subscription/my] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// PUT /:id — 更新订阅
router.put('/:id', auth, async (req, res) => {
  try {
    const sub = await PushSubscription.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!sub) {
      return res.status(404).json(resJSON(404, '订阅不存在', null))
    }
    const { endpoint, keys, userAgent } = req.body
    const update = {}
    if (endpoint) update.endpoint = endpoint
    if (keys) {
      if (keys.p256dh) update.p256dh = keys.p256dh
      if (keys.auth) update.auth = keys.auth
    }
    if (userAgent) update.userAgent = userAgent
    await sub.update(update)
    return res.status(200).json(resJSON(0, 'ok', sub))
  } catch (err) {
    console.error('[PUT /push/subscription/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// DELETE /:id — 取消订阅
router.delete('/:id', auth, async (req, res) => {
  try {
    const sub = await PushSubscription.findOne({ where: { id: req.params.id, userId: req.userId } })
    if (!sub) {
      return res.status(404).json(resJSON(404, '订阅不存在', null))
    }
    await sub.destroy()
    return res.status(200).json(resJSON(0, 'ok', null))
  } catch (err) {
    console.error('[DELETE /push/subscription/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router