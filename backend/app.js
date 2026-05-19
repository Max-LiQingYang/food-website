'use strict'

/**
 * app.js
 * Express 应用入口
 *
 * 职责：
 *   - 加载环境变量（dotenv）
 *   - 创建 app 实例
 *   - 挂载所有中间件
 *   - 挂载路由
 *   - 挂载错误处理
 *   - 提供健康检查端点
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const errorHandler = require('./middleware/errorHandler')

const app = express()

// ─────────────────────────────────────────────────────────────────
// 1. 安全中间件
// ─────────────────────────────────────────────────────────────────
app.use(helmet())

// ─────────────────────────────────────────────────────────────────
// 2. CORS（来自 env，支持逗号分隔的多个域名）
// ─────────────────────────────────────────────────────────────────
const rawOrigins = process.env.CORS_ORIGIN || ''
const corsOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// ─────────────────────────────────────────────────────────────────
// 3. 限流（来自 env）
// ─────────────────────────────────────────────────────────────────
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000 // 15 min
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100

app.use(
  rateLimit({
    windowMs: rateLimitWindow,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      code: 429,
      message: '请求过于频繁，请稍后再试',
      data: null
    }
  })
)

// ─────────────────────────────────────────────────────────────────
// 4. 请求体解析
// ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─────────────────────────────────────────────────────────────────
// 5. 健康检查端点
// ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ─────────────────────────────────────────────────────────────────
// 6. 路由（API 入口统一前缀 /api）
// ─────────────────────────────────────────────────────────────────
app.use('/api/favorites', require('./routes'))

// ─────────────────────────────────────────────────────────────────
// 7. 404（路由未匹配）
// ─────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  })
})

// ─────────────────────────────────────────────────────────────────
// 8. 全局错误处理（始终最后注册）
// ─────────────────────────────────────────────────────────────────
app.use(errorHandler)

module.exports = app
