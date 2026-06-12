#!/usr/bin/env node
'use strict'

/**
 * quality-check.js - 内容质量巡检脚本
 *
 * 用法: node scripts/quality-check.js
 *       node scripts/quality-check.js --local
 */

const { Sequelize } = require('sequelize')

const isLocal = process.argv.includes('--local')

const seq = isLocal
  ? new Sequelize({ dialect: 'sqlite', storage: './data/food.db', logging: false })
  : new Sequelize({
      host: process.env.DB_HOST || '172.17.0.1',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'food_website',
      username: process.env.DB_USER || 'food_user',
      password: process.env.DB_PASS || 'food_password',
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: false,
    })

async function main() {
  await seq.authenticate()
  const dbName = isLocal ? '本地 SQLite' : '生产 MariaDB'
  console.log(`\n=== 内容质量巡检 [${dbName}] ===\n`)

  const total = (await seq.query('SELECT COUNT(*) as c FROM recipes', { type: Sequelize.QueryTypes.SELECT }))[0].c
  console.log(`食谱总数: ${total}`)

  // story 覆盖
  const ms = (await seq.query("SELECT COUNT(*) as c FROM recipes WHERE story IS NULL OR story = ''", { type: Sequelize.QueryTypes.SELECT }))[0].c
  console.log(`story 覆盖: ${total-ms}/${total} ${ms===0?'✅':'❌'}`)

  const mb = (await seq.query("SELECT COUNT(*) as c FROM recipes WHERE culturalBackground IS NULL OR culturalBackground = ''", { type: Sequelize.QueryTypes.SELECT }))[0].c
  console.log(`culturalBackground 覆盖: ${total-mb}/${total} ${mb===0?'✅':'❌'}`)

  const vc = (await seq.query('SELECT COUNT(DISTINCT recipeId) as c FROM video_embeds', { type: Sequelize.QueryTypes.SELECT }))[0].c
  console.log(`视频覆盖: ${vc}/${total} ${vc===total?'✅':'⚠️'}`)

  // 逐行检查 JSON 字段
  const rows = await seq.query('SELECT title, nutrition, categoryTags, steps, ingredients, commentCount FROM recipes', { type: Sequelize.QueryTypes.SELECT })
  let bn=0, bt=0, bs=0, bi=0, nr=0

  for (const r of rows) {
    try {
      const n = typeof r.nutrition === 'string' ? JSON.parse(r.nutrition) : r.nutrition
      if (!n || typeof n.calories !== 'number') { bn++; continue }
    } catch { bn++; continue }

    try {
      const c = typeof r.categoryTags === 'string' ? JSON.parse(r.categoryTags) : r.categoryTags
      if (!c || Object.keys(c).length < 3) bt++
    } catch { bt++ }

    try {
      const s = typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps
      if (!Array.isArray(s) || s.length < 3) bs++
    } catch { bs++ }

    try {
      const i = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients
      if (!Array.isArray(i) || i.length < 3) bi++
    } catch { bi++ }

    if (!r.ratingCount || r.ratingCount === 0) nr++
  }

  console.log(`nutrition 完整性: ${total-bn}/${total} ${bn===0?'✅':'❌'}`)
  console.log(`categoryTags 完整性: ${total-bt}/${total} ${bt===0?'✅':'❌'}`)
  console.log(`steps 完整性(≥3): ${total-bs}/${total} ${bs===0?'✅':'❌'}`)
  console.log(`ingredients 完整性(≥3): ${total-bi}/${total} ${bi===0?'✅':'❌'}`)
  console.log(`评分覆盖: ${total-nr}/${total} ${nr===0?'✅':'❌'}`)

  // ═══ 4 维评分覆盖统计（独立段落，不影响 exit code）═══
  // T-2026-0612-003: 从 dimension-coverage-check.js 导入 check4DimensionalCoverage
  // 内部全量 try-catch 异常隔离：DB 故障 → { skipped: true, reason }，不 throw
  try {
    const { check4DimensionalCoverage } = require('./dimension-coverage-check.js')
    const r4d = await check4DimensionalCoverage(seq)
    if (r4d && !r4d.skipped) {
      const cov = r4d.coverage
      console.log('\n📊 4 维评分覆盖')
      console.log(`  口味:     ${cov.taste.covered}/${cov.taste.total}`)
      console.log(`  难度:     ${cov.difficulty.covered}/${cov.difficulty.total}`)
      console.log(`  外观:     ${cov.presentation.covered}/${cov.presentation.total}`)
      console.log(`  性价比:   ${cov.value.covered}/${cov.value.total}`)
      console.log(`  全 0 孤儿: ${r4d.orphanCount}`)
    } else if (r4d && r4d.skipped) {
      console.warn(`⚠ 4 维评分覆盖统计跳过（${r4d.reason}）`)
    }
  } catch (err) {
    // 防御性外层 catch：require 失败、函数签名错误等极低概率异常
    console.warn(`⚠ 4 维评分覆盖统计跳过（模块加载失败: ${err.message}）`)
  }
  // 注意：不修改 allPass，不改变 exit code

  const allPass = ms+mb+bn+bt+bs+bi+nr === 0 && vc === total
  console.log(`\n${allPass ? '✅ 全部通过' : '❌ 存在异常'}`)

  await seq.close()
  process.exit(allPass ? 0 : 1)
}

main().catch(e => { console.error(e.message); process.exit(1) })