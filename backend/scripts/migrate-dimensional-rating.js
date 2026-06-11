'use strict'

/**
 * 脚本：comments 表添加四维评分字段（幂等）
 * 用法：node scripts/migrate-dimensional-rating.js
 * 字段：taste / difficulty / presentation / value（INT NULL，位于 rating 后）
 */

const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_website'
  })

  try {
    // 幂等检查：如果 taste 列已存在说明迁移已执行过
    const [columns] = await db.query("SHOW COLUMNS FROM comments LIKE 'taste'")
    if (columns.length > 0) {
      console.log('✅ 迁移已执行（taste 列已存在），跳过')
      return
    }

    console.log('🔄 开始添加四维评分字段...')

    await db.query(`ALTER TABLE comments
      ADD COLUMN taste INT NULL COMMENT '口味评分(1-5)' AFTER rating`)
    console.log('  ✅ taste')

    await db.query(`ALTER TABLE comments
      ADD COLUMN difficulty INT NULL COMMENT '难度评分(1-5)' AFTER taste`)
    console.log('  ✅ difficulty')

    await db.query(`ALTER TABLE comments
      ADD COLUMN presentation INT NULL COMMENT '卖相评分(1-5)' AFTER difficulty`)
    console.log('  ✅ presentation')

    await db.query(`ALTER TABLE comments
      ADD COLUMN value INT NULL COMMENT '性价比评分(1-5)' AFTER presentation`)
    console.log('  ✅ value')

    console.log('🎉 迁移完成！')
  } finally {
    await db.end()
  }
}

main().catch(err => {
  console.error('❌ 迁移失败:', err.message)
  process.exit(1)
})
