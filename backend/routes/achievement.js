'use strict'

/**
 * routes/achievement.js
 * 成就系统路由
 *
 * GET  /              — 获取当前用户成就列表（需认证）
 * GET  /user/:userId  — 获取指定用户成就（无需认证）
 */

const express = require('express')
const { Achievement } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户成就列表
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const achievements = await Achievement.findAll({
      where: { userId: req.userId },
      order: [['unlockedAt', 'DESC']]
    })
    return res.status(200).json(resJSON(0, 'ok', achievements))
  } catch (err) {
    console.error('[GET /achievements] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /user/:userId — 获取指定用户成就
// ─────────────────────────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const achievements = await Achievement.findAll({
      where: { userId: req.params.userId },
      order: [['unlockedAt', 'DESC']]
    })
    return res.status(200).json(resJSON(0, 'ok', achievements))
  } catch (err) {
    console.error('[GET /achievements/user/:userId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router