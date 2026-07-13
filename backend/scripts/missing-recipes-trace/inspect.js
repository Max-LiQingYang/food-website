#!/usr/bin/env node
/**
 * T-2026-0617-005 missing-recipes-trace: 巡检脚本（Node 版，零写库）
 *
 * 用法：
 *   cd backend && node scripts/missing-recipes-trace/inspect.js
 *
 * 行为：仅执行 SELECT 查询，输出四张表：
 *   1. 当前基线（total/min/max createdAt）
 *   2. 旧版 10 道指纹搜索（应 0 行）
 *   3. 新版 10 道验证（含 view/favorite/comment 计数）
 *   4. 关联表残留检测（favorites/comments，应 0 行）
 *
 * 与 inspect.sql 等价但纯 JS，可读 DB 而无需 sqlite3 CLI。
 */

'use strict'

const { sequelize } = require('../../models')

const OLD_PARTIALS = [
  ['7ba9985a', '冬阴功汤'],
  ['b1901221', '回锅肉'],
  ['3acc7ea6', '提拉米苏'],
  ['a535bb2d', '法式洋葱汤'],
  ['a182c8e6', '泰式绿咖喱鸡'],
  ['2fff92e4', '班尼迪克蛋'],
  ['63cd90c0', '芒果糯米饭'],
  ['0a40d033', '蒜蓉粉丝蒸扇贝'],
  ['e4ca8023', '韩式拌饭'],
  ['e1896402', '鱼香肉丝']
]

const NEW_PARTIALS = [
  ['09dbb410', '冬阴功汤'],
  ['57bb4513', '回锅肉'],
  ['30eb4af1', '提拉米苏'],
  ['b00be566', '法式洋葱汤'],
  ['224220d6', '泰式绿咖喱鸡'],
  ['14302720', '班尼迪克蛋'],
  ['b0d365e7', '芒果糯米饭'],
  ['8f72bfdd', '蒜蓉粉丝蒸扇贝'],
  ['e009b9db', '韩式拌饭'],
  ['3fa05f8f', '鱼香肉丝']
]

const OLD_TS = '2026-05-23 02:52:39'
const NEW_TS = '2026-05-24 05:01:06'

function row (cols) { return cols.map(c => String(c ?? 'NULL').padEnd(28)).join(' | ') }

async function main () {
  console.log('=== T-2026-0617-005 missing-recipes-trace 巡检 ===\n')

  // 1. baseline
  const [base] = await sequelize.query(
    "SELECT COUNT(*) AS total, MIN(createdAt) AS min_c, MAX(createdAt) AS max_c FROM recipes"
  )
  console.log('[1] 当前基线')
  console.log('  total =', base[0].total, '| min =', base[0].min_c, '| max =', base[0].max_c)
  console.log('  expected: total=84, min=2026-05-23, max=2026-05-30+\n')

  // 2. old partials should be 0
  const oldLikes = OLD_PARTIALS.map(p => `id LIKE '${p[0]}%'`).join(' OR ')
  const [oldRows] = await sequelize.query(
    `SELECT id, title, createdAt FROM recipes WHERE createdAt LIKE '${OLD_TS}%' AND (${oldLikes})`
  )
  console.log('[2] 旧版 10 道指纹搜索（期望 0 行）')
  console.log('  rows =', oldRows.length, oldRows.length === 0 ? '✓' : '✗ ANOMALY')
  if (oldRows.length) oldRows.forEach(r => console.log('   ', r.id, r.title))
  console.log()

  // 3. new partials should be 10
  const newLikes = NEW_PARTIALS.map(p => `id LIKE '${p[0]}%'`).join(' OR ')
  const [newRows] = await sequelize.query(
    `SELECT id, title, viewCount, favoriteCount, commentCount FROM recipes WHERE createdAt LIKE '${NEW_TS}%' AND (${newLikes}) ORDER BY title`
  )
  console.log('[3] 新版 10 道验证（期望 10/10 命中）')
  console.log(row(['title', 'view', 'fav', 'comment']))
  console.log('-'.repeat(110))
  newRows.forEach(r => console.log(row([r.title, r.viewCount, r.favoriteCount, r.commentCount])))
  console.log('  hit =', newRows.length, '/ 10', newRows.length === 10 ? '✓' : '✗ ANOMALY')
  console.log()

  // 4. residual references
  const [favResid] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM favorites WHERE ${oldLikes.replace(/id/g, 'recipeId')}`
  )
  const [comResid] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM comments WHERE ${oldLikes.replace(/id/g, 'recipeId')}`
  )
  console.log('[4] 关联表残留检测（期望均为 0）')
  console.log('  favorites_old_residual =', favResid[0].cnt, favResid[0].cnt === 0 ? '✓' : '✗ ANOMALY')
  console.log('  comments_old_residual  =', comResid[0].cnt, comResid[0].cnt === 0 ? '✓' : '✗ ANOMALY')
  console.log()

  // verdict
  const ok = oldRows.length === 0 && newRows.length === 10 && favResid[0].cnt === 0 && comResid[0].cnt === 0
  console.log('=== 结论 ===')
  console.log(ok ? '✓ 全部期望命中：10 道消失食谱已被 migrate-duplicates.js 合并（旧版已删，新版 10/10 存活，关联表 0 残留）' : '✗ 发现异常，需人工复核')

  await sequelize.close()
}

main().catch(err => {
  console.error('inspect failed:', err.message)
  process.exit(1)
})
