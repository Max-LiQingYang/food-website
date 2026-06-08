'use strict'

/**
 * routes/notificationPreferences.js
 * 通知偏好（per-type × per-channel）路由
 *
 * GET  /api/notification-preferences          — 获取当前用户通知偏好
 * PUT  /api/notification-preferences          — 更新通知偏好
 *
 * 数据模型（存储在 User.preferences.notificationPreferences）：
 *   {
 *     follow:              { inApp: true, push: true },
 *     comment:             { inApp: true, push: true },
 *     reply:               { inApp: true, push: true },
 *     favorite:            { inApp: true, push: true },
 *     collection_add:      { inApp: true, push: true },
 *     meal_plan_reminder:  { inApp: true, push: true },
 *     cooking_log_reminder:{ inApp: true, push: true },
 *     achievement_unlock:  { inApp: true, push: true },
 *     challenge_update:    { inApp: true, push: true },
 *     system:              { inApp: true, push: true }
 *   }
 */

const express = require('express')
const { User } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

const SUPPORTED_TYPES = [
  'follow',
  'comment',
  'reply',
  'favorite',
  'collection_add',
  'meal_plan_reminder',
  'cooking_log_reminder',
  'achievement_unlock',
  'challenge_update',
  'system'
]

function defaultPrefs() {
  const out = {}
  for (const t of SUPPORTED_TYPES) {
    out[t] = { inApp: true, push: true }
  }
  return out
}

function parsePrefs(user) {
  if (!user || !user.preferences) return {}
  try {
    return typeof user.preferences === 'string'
      ? JSON.parse(user.preferences)
      : user.preferences
  } catch {
    return {}
  }
}

function mergeNotifPrefs(stored) {
  const defaults = defaultPrefs()
  const out = {}
  for (const t of SUPPORTED_TYPES) {
    const s = (stored && stored[t]) || {}
    out[t] = {
      inApp: s.inApp !== false,
      push: s.push !== false
    }
    // 应用默认值
    if (typeof s.inApp !== 'boolean') out[t].inApp = defaults[t].inApp
    if (typeof s.push !== 'boolean') out[t].push = defaults[t].push
  }
  return out
}

/**
 * GET /api/notification-preferences
 * 返回当前用户的 per-type per-channel 通知偏好
 */
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: ['preferences'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }
    const allPrefs = parsePrefs(user)
    const notifPrefs = mergeNotifPrefs(allPrefs.notificationPreferences)
    return res.status(200).json(resJSON(0, 'ok', notifPrefs))
  } catch (err) {
    console.error('[GET /notification-preferences] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

/**
 * PUT /api/notification-preferences
 * Body: { [type]: { inApp: boolean, push: boolean }, ... }
 * 仅合并已知类型，未知类型忽略，未提供字段保留原值
 */
router.put('/', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: ['id', 'preferences'] })
    if (!user) {
      return res.status(404).json(resJSON(404, '用户不存在', null))
    }

    const allPrefs = parsePrefs(user)
    const existingNotif = mergeNotifPrefs(allPrefs.notificationPreferences)

    const body = req.body || {}
    for (const t of SUPPORTED_TYPES) {
      if (body[t] && typeof body[t] === 'object') {
        if (typeof body[t].inApp === 'boolean') existingNotif[t].inApp = body[t].inApp
        if (typeof body[t].push === 'boolean') existingNotif[t].push = body[t].push
      }
    }

    const merged = { ...allPrefs, notificationPreferences: existingNotif }
    await User.update(
      { preferences: JSON.stringify(merged) },
      { where: { id: req.userId } }
    )

    return res.status(200).json(resJSON(0, 'ok', existingNotif))
  } catch (err) {
    console.error('[PUT /notification-preferences] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router
