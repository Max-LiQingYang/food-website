'use strict'

/**
 * server.js
 * 启动 HTTP 服务
 *
 * 职责：
 *   - 加载环境变量（dotenv）
 *   - 初始化数据库连接（sequelize.sync）
 *   - 启动 Express 监听
 */

require('dotenv').config()

// 初始化 sequelize（加载所有模型 + 建立连接）
const db = require('./models')

const PORT = process.env.PORT || 3001

// 同步模型到数据库（生产环境不 alter，安全迁移请用 migration 工具）
const syncOptions =
  process.env.NODE_ENV === 'production'
    ? {} // 生产环境：严格模式，不自动修改表结构
    : { alter: true } // 开发/测试：自动补充缺失字段

async function start() {
  try {
    console.log(`[db] Syncing models (NODE_ENV=${process.env.NODE_ENV || 'development'})...`)
    await db.sequelize.sync(syncOptions)
    console.log('[db] Models synced successfully.')

    // 延迟加载 app（避免循环依赖）
    const app = require('./app')

    const server = app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/health`)
    })

    // 优雅退出
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`)
      server.close(() => {
        console.log('HTTP server closed.')
        db.sequelize.close().then(() => {
          console.log('Database connection closed.')
          process.exit(0)
        })
      })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    console.error('[server] Failed to start:', err)
    process.exit(1)
  }
}

start()
