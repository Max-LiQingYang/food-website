#!/usr/bin/env node
/**
 * sync-quality-score.js
 * 一次性同步脚本：为所有食谱计算并写入 qualityScore
 *
 * qualityScore 公式：
 *   score = viewCount * 0.3 + favoriteCount * 2 + avgRating * 5 + commentCount * 1.5
 *   其中 avgRating 和 commentCount 从 comments 表聚合
 *
 * 注意：如果 recipes 表没有 qualityScore 列，脚本会先 ALTER TABLE 添加
 *
 * 用法：cd backend && node scripts/sync-quality-score.js
 */

'use strict'

const { sequelize } = require('../models')

async function ensureQualityScoreColumn () {
  // Check if qualityScore column exists
  const dialect = sequelize.getDialect()

  if (dialect === 'mysql') {
    const [cols] = await sequelize.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recipes' AND COLUMN_NAME = 'qualityScore'"
    )
    if (cols.length === 0) {
      console.log('Adding qualityScore column to recipes table...')
      await sequelize.query(
        "ALTER TABLE recipes ADD COLUMN qualityScore DOUBLE DEFAULT 0 COMMENT '质量评分（物化字段，由脚本同步）'"
      )
      console.log('✓ qualityScore column added')
    } else {
      console.log('✓ qualityScore column already exists')
    }
  } else if (dialect === 'sqlite') {
    const [cols] = await sequelize.query("PRAGMA table_info(recipes)")
    const hasCol = cols.some(c => c.name === 'qualityScore')
    if (!hasCol) {
      console.log('Adding qualityScore column to recipes table (SQLite)...')
      await sequelize.query(
        "ALTER TABLE recipes ADD COLUMN qualityScore DOUBLE DEFAULT 0"
      )
      console.log('✓ qualityScore column added')
    } else {
      console.log('✓ qualityScore column already exists')
    }
  } else {
    console.log(`⚠ Dialect ${dialect}: assuming qualityScore column exists. If not, add it manually.`)
  }
}

async function main () {
  console.log('=== Syncing qualityScore for all recipes ===\n')

  await ensureQualityScoreColumn()

  // Aggregate avgRating and commentCount from comments table
  const [rows] = await sequelize.query(`
    SELECT
      r.id,
      r.viewCount,
      r.favoriteCount,
      COALESCE(COUNT(c.id), 0) AS commentCount,
      COALESCE(AVG(c.rating), 0) AS avgRating
    FROM recipes r
    LEFT JOIN comments c ON c.recipeId = r.id
    GROUP BY r.id
  `)

  console.log(`Found ${rows.length} recipes to update\n`)

  let updated = 0
  for (const row of rows) {
    const { id, viewCount, favoriteCount, commentCount, avgRating } = row
    const score = (viewCount || 0) * 0.3
      + (favoriteCount || 0) * 2
      + (avgRating || 0) * 5
      + (commentCount || 0) * 1.5
    const truncated = Math.round(score * 10) / 10

    await sequelize.query(
      'UPDATE recipes SET qualityScore = ? WHERE id = ?',
      { replacements: [truncated, id] }
    )
    updated++
  }

  console.log(`✓ Synced qualityScore for ${updated} recipes`)

  // Show top 5 for verification
  const [top] = await sequelize.query(
    'SELECT title, qualityScore, viewCount, favoriteCount FROM recipes ORDER BY qualityScore DESC LIMIT 5'
  )
  console.log('\nTop 5 recipes by qualityScore:')
  for (const r of top) {
    console.log(`  ${r.title}: ${r.qualityScore} (views=${r.viewCount}, favs=${r.favoriteCount})`)
  }

  console.log('\n=== Sync complete! ===')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Sync failed:', err)
    process.exit(1)
  })
