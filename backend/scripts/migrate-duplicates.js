#!/usr/bin/env node
/**
 * migrate-duplicates.js
 * 一次性迁移脚本：清理 10 对重复食谱
 *
 * 逻辑：
 * 1. 用 partial ID + createdAt 定位旧版和新版食谱的完整 UUID
 * 2. 更新所有关联表（comments, favorites, video_embeds, cooking_logs, collection_recipes, challenge_submissions）
 *    将旧版 recipeId → 新版 recipeId
 * 3. 使用 UPDATE IGNORE 处理 favorites 的 UNIQUE(userId, recipeId) 冲突
 * 4. 删除旧版食谱记录
 *
 * 用法：cd backend && node scripts/migrate-duplicates.js
 */

'use strict'

const { sequelize } = require('../models')

// 旧版 partial ID → 新版 partial ID
const partialMapping = {
  '7ba9985a': '09dbb410', // 冬阴功汤
  'b1901221': '57bb4513', // 回锅肉
  '3acc7ea6': '30eb4af1', // 提拉米苏
  'a535bb2d': 'b00be566', // 法式洋葱汤
  'a182c8e6': '224220d6', // 泰式绿咖喱鸡
  '2fff92e4': '14302720', // 班尼迪克蛋
  '63cd90c0': 'b0d365e7', // 芒果糯米饭
  '0a40d033': '8f72bfdd', // 蒜蓉粉丝蒸扇贝
  'e4ca8023': 'e009b9db', // 韩式拌饭
  'e1896402': '3fa05f8f'  // 鱼香肉丝
}

const OLD_CREATED_AT = '2026-05-23 02:52:39'
const NEW_CREATED_AT = '2026-05-24 05:01:06'

const tables = [
  'comments',
  'favorites',
  'video_embeds',
  'cooking_logs',
  'collection_recipes',
  'challenge_submissions'
]

async function resolveFullId (partial, createdAt) {
  const [rows] = await sequelize.query(
    "SELECT id, title FROM recipes WHERE id LIKE ? AND createdAt LIKE ? LIMIT 1",
    { replacements: [partial + '%', createdAt + '%'] }
  )
  if (rows.length === 0) {
    throw new Error(`Cannot find recipe with id LIKE '${partial}%' and createdAt LIKE '${createdAt}%'`)
  }
  return { id: rows[0].id, title: rows[0].title }
}

async function main () {
  console.log('=== Starting duplicate recipe migration ===\n')

  // Step 1: Resolve full IDs
  const mapping = {}
  for (const [oldPartial, newPartial] of Object.entries(partialMapping)) {
    const oldRecipe = await resolveFullId(oldPartial, OLD_CREATED_AT)
    const newRecipe = await resolveFullId(newPartial, NEW_CREATED_AT)
    mapping[oldRecipe.id] = newRecipe.id
    console.log(`✓ Mapped: ${oldRecipe.title} (${oldPartial}) → ${newRecipe.title} (${newPartial})`)
    console.log(`  Old ID: ${oldRecipe.id}`)
    console.log(`  New ID: ${newRecipe.id}`)
  }
  console.log('')

  // Step 2: Migrate references in all related tables
  for (const [oldId, newId] of Object.entries(mapping)) {
    console.log(`--- Migrating references for ${oldId} → ${newId} ---`)
    for (const tbl of tables) {
      try {
        // For favorites, use UPDATE IGNORE to handle UNIQUE constraint conflicts
        const [result] = await sequelize.query(
          `UPDATE IGNORE ${tbl} SET recipeId = ? WHERE recipeId = ?`,
          { replacements: [newId, oldId] }
        )
        const affected = result.affectedRows || 0
        console.log(`  ${tbl}: ${affected} rows migrated`)
      } catch (err) {
        console.error(`  ${tbl}: ERROR - ${err.message}`)
        // For SQLite which doesn't support UPDATE IGNORE, try a different approach
        if (err.message.includes('UPDATE IGNORE') || err.message.includes('near "IGNORE"')) {
          // Fallback: delete duplicates first, then update
          if (tbl === 'favorites') {
            // Delete old favorites that would conflict (same userId already has new recipeId)
            await sequelize.query(
              `DELETE FROM ${tbl} WHERE recipeId = ? AND userId IN (SELECT userId FROM ${tbl} WHERE recipeId = ?)`,
              { replacements: [oldId, newId] }
            )
          }
          const [result] = await sequelize.query(
            `UPDATE ${tbl} SET recipeId = ? WHERE recipeId = ?`,
            { replacements: [newId, oldId] }
          )
          const affected = result.affectedRows || 0
          console.log(`  ${tbl} (fallback): ${affected} rows migrated`)
        } else {
          throw err
        }
      }
    }

    // Step 3: Delete old recipe
    await sequelize.query('DELETE FROM recipes WHERE id = ?', { replacements: [oldId] })
    console.log(`  ✓ Deleted old recipe ${oldId}\n`)
  }

  console.log('=== Migration complete! ===')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
