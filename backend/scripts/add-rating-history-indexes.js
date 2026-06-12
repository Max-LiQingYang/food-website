'use strict'

/**
 * 脚本：comments 表新增两个索引（幂等）
 * 用途：支持评分历史模块的查询性能（ARCH §4.1）
 * 用法：node scripts/add-rating-history-indexes.js
 *
 * 索引：
 *   1. idx_comment_userId_rating              — 支持 TOP 5 高/低分查询、history 按 rating 排序
 *   2. idx_comment_userId_recipeId_createdAt  — 支持"按 recipeId 取最新" 去重子查询
 *
 * 已有索引（确认存在即可，不重复添加）：
 *   - idx_comment_userId
 *   - idx_comment_recipeId
 *   - idx_comment_recipeId_createdAt
 *   - idx_comment_parentId
 */

const mysql = require('mysql2/promise')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const INDEXES_TO_ADD = [
  {
    name: 'idx_comment_userId_rating',
    columns: ['userId', 'rating'],
    description: '支持 TOP 5 + history 按 rating 排序'
  },
  {
    name: 'idx_comment_userId_recipeId_createdAt',
    columns: ['userId', 'recipeId', 'createdAt'],
    description: '支持"按 recipeId 取最新"去重子查询'
  }
]

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'food_website'
  })

  try {
    let addedCount = 0
    let skippedCount = 0

    for (const idx of INDEXES_TO_ADD) {
      // 幂等检查：SHOW INDEX FROM comments WHERE Key_name = ?
      const [existing] = await db.query(
        'SHOW INDEX FROM comments WHERE Key_name = ?',
        [idx.name]
      )

      if (existing.length > 0) {
        console.log(`⏭️  ${idx.name} 已存在，跳过`)
        skippedCount++
        continue
      }

      console.log(`🔄 添加索引 ${idx.name} (${idx.description})...`)
      const columnList = idx.columns.map(c => '`' + c + '`').join(', ')
      await db.query('ALTER TABLE comments ADD INDEX `' + idx.name + '` (' + columnList + ')')
      console.log(`  ✅ ${idx.name} 添加成功（${idx.columns.join(' + ')}）`)
      addedCount++
    }

    console.log('')
    console.log('📊 汇总：')
    console.log(`  新增：${addedCount} 个索引`)
    console.log(`  跳过：${skippedCount} 个索引（已存在）`)
    if (addedCount > 0) {
      console.log('🎉 迁移完成！')
    } else {
      console.log('✅ 无需变更（所有索引已就位）')
    }
  } finally {
    await db.end()
  }
}

main().catch(err => {
  console.error('❌ 迁移失败:', err.message)
  process.exit(1)
})
