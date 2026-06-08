'use strict'

/**
 * routes/vapid.js
 * 提供 VAPID 公钥给前端（运行时获取，无需编译时注入）
 *
 * GET /api/vapid-public-key — 返回 VAPID 公钥
 */

const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    return res.status(404).json({ code: 404, message: 'VAPID 公钥未配置', data: null })
  }
  return res.status(200).json({ code: 0, message: 'ok', data: { publicKey } })
})

module.exports = router
