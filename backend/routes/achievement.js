'use strict'

/**
 * routes/achievement.js
 * 成就系统路由
 *
 * GET  /              — 获取当前用户成就列表（需认证）
 * GET  /user/:userId  — 获取指定用户完整成就列表（含未解锁，含进度）
 */

const express = require('express')
const { Achievement } = require('../models')
const auth = require('../middleware/auth')
const { getAllAchievementsWithProgress } = require('../utils/achievementChecker')

const router = express.Router()

function resJSON(code, message, data) {
  return { code, message, data }
}

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户成就列表（已解锁）
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
// GET /user/:userId — 获取指定用户完整成就列表（含进度）
// 返回所有成就定义 + 用户解锁状态 + 当前进度
// ─────────────────────────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await getAllAchievementsWithProgress(req.params.userId)
    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /achievements/user/:userId] Error:', err)
    return res.status(500).json(resJSON(500, '服务器错误', null))
  }
})

module.exports = router