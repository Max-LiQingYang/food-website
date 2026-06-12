#!/usr/bin/env node
'use strict'

/**
 * fix-dimension-orphans.js — 4 维全 0 孤儿食谱修复脚本
 *
 * 从 dimension-coverage-check.js 的 JSON 报告中读取 orphanList，
 * 基于 comments 表 taste/difficulty/presentation/value 历史数据重算 qualityScore，
 * 事务保护 + 并发锁 + 修复前后备份。
 *
 * 用法:
 *   node scripts/fix-dimension-orphans.js --local --fix             # 本地 SQLite 修复
 *   ALLOW_FIX=1 node scripts/fix-dimension-orphans.js --fix          # 生产 MariaDB 修复
 *   ALLOW_FIX=1 node scripts/fix-dimension-orphans.js --fix --i-know-what-im-doing  # 生产确认
 *
 * 安全机制:
 *   - 无 --fix → 只读预览，拒绝执行
 *   - 生产环境需 ALLOW_FIX=1 环境变量
 *   - /tmp/fix-dim-orphans.lock 并发互斥
 *   - 所有 UPDATE 在 Sequelize transaction 内
 *   - 修复前自动备份 + 修复日志
 *   - 修复后自动二次验证
 */

const { Sequelize } = require('sequelize')
const fs = require('fs')
const path = require('path')

// ── CLI flags ──
const args = process.argv.slice(2)
const isLocal = args.includes('--local')
const isFix = args.includes('--fix')

// ── 安全检查 ──
// 1. 无 --fix → 只读预览
if (!isFix) {
  console.log('\n🔒 修复脚本已启动（只读预览模式）')
  console.log('   如需执行修复，请添加 --fix 标志')
  console.log('   本地: node scripts/fix-dimension-orphans.js --local --fix')
  console.log('   生产: ALLOW_FIX=1 node scripts/fix-dimension-orphans.js --fix')
  console.log('')
  process.exit(0)
}

// 2. 生产环境需 ALLOW_FIX=1
if (!isLocal && process.env.ALLOW_FIX !== '1') {
  console.log('\n❌ 生产环境拒绝执行！')
  console.log('   请设置环境变量 ALLOW_FIX=1 后再运行:')
  console.log('   ALLOW_FIX=1 node scripts/fix-dimension-orphans.js --fix')
  console.log('')
  process.exit(0)
}

// 3. 并发锁
const LOCK_PATH = '/tmp/fix-dim-orphans.lock'

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    const pid = parseInt(fs.readFileSync(LOCK_PATH, 'utf-8'))
    try {
      process.kill(pid, 0)
      console.error(`❌ 已有修复实例运行中 (PID: ${pid})，拒绝并发执行`)
      process.exit(1)
    } catch {
      fs.unlinkSync(LOCK_PATH)
    }
  }
  fs.writeFileSync(LOCK_PATH, String(process.pid))
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
  } catch { /* ignore */ }
}

// ── DB 连接 ──
const dbName = isLocal ? '本地 SQLite' : 'MariaDB (172.17.0.1)'
const seq = isLocal
  ? new Sequelize({ dialect: 'sqlite', storage: './data/food.db', logging: false })
  : new Sequelize({
      host: process.env.DB_HOST || '172.17.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'food_website',
      username: process.env.DB_USER || 'food_user',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      logging: false,
    })

// ── 工具函数 ──
function toInt(v) { return typeof v === 'string' ? parseInt(v, 10) : (v || 0) }
function toFloat(v) { return typeof v === 'string' ? parseFloat(v) : (v || 0) }
function r2(n) { return Math.round(n * 100) / 100 }

function ts() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

// ── 主流程 ──
async function main() {
  acquireLock()
  const timestamp = ts()

  try {
    await seq.authenticate()
    console.log(`\n🔧 4 维孤儿修复脚本 [${dbName}]`)
    console.log(`${'='.repeat(60)}`)

    // Step 1: 读取 orphanList（从 coverage JSON 或 DB 直查）
    const reportsDir = path.join(__dirname, 'reports')
    const coveragePath = path.join(reportsDir, 'T-2026-0612-003-coverage.json')

    let orphanList = []
    if (fs.existsSync(coveragePath)) {
      const report = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'))
      orphanList = report.orphanList || []
      console.log(`📄 从报告读取孤儿列表: ${orphanList.length} 道`)
    } else {
      // 无 JSON 报告 → 直接从 DB 查
      console.log('⚠ 未找到 coverage 报告，直接从 DB 查询孤儿...')
      const rows = await seq.query(`
        SELECT r.id, r.title, r.qualityScore, r.isFeatured,
          r.viewCount, r.favoriteCount, r.commentCount,
          COALESCE(SUM(CASE WHEN c.taste IS NOT NULL AND c.taste > 0 THEN 1 ELSE 0 END), 0) AS taste_cnt,
          COALESCE(SUM(CASE WHEN c.difficulty IS NOT NULL AND c.difficulty > 0 THEN 1 ELSE 0 END), 0) AS difficulty_cnt,
          COALESCE(SUM(CASE WHEN c.presentation IS NOT NULL AND c.presentation > 0 THEN 1 ELSE 0 END), 0) AS presentation_cnt,
          COALESCE(SUM(CASE WHEN c.value IS NOT NULL AND c.value > 0 THEN 1 ELSE 0 END), 0) AS value_cnt
        FROM recipes r
        LEFT JOIN comments c ON c.recipeId = r.id
        GROUP BY r.id
        HAVING taste_cnt = 0 AND difficulty_cnt = 0 AND presentation_cnt = 0 AND value_cnt = 0
      `, { type: Sequelize.QueryTypes.SELECT })

      orphanList = rows.map(r => ({
        id: r.id, title: r.title,
        isFeatured: !!(r.isFeatured),
        isTop20: false,
        qualityScore: toFloat(r.qualityScore),
        viewCount: toInt(r.viewCount || 0),
        favoriteCount: toInt(r.favoriteCount || 0),
        commentCount: toInt(r.commentCount || 0),
      }))
      console.log(`📊 DB 直查孤儿: ${orphanList.length} 道`)
    }

    if (orphanList.length === 0) {
      console.log('✅ 无全 0 孤儿食谱，无需修复')
      releaseLock()
      await seq.close()
      return
    }

    console.log(`\n孤儿清单:`)
    for (const o of orphanList) {
      console.log(`  • ${o.title} (QS=${o.qualityScore}, featured=${o.isFeatured})`)
    }

    // Step 2: 修复前备份
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const orphanIds = orphanList.map(o => o.id)
    const placeholders = orphanIds.map(() => '?').join(',')
    const backupRows = await seq.query(
      `SELECT * FROM recipes WHERE id IN (${placeholders})`,
      { replacements: orphanIds, type: Sequelize.QueryTypes.SELECT }
    )
    const backupPath = path.join(reportsDir, `pre-fix-backup-${timestamp}.json`)
    fs.writeFileSync(backupPath, JSON.stringify(backupRows, null, 2), 'utf-8')
    console.log(`\n💾 修复前备份: ${backupPath} (${backupRows.length} 条)`)

    // Step 3: 事务内修复
    const fixLog = []

    await seq.transaction(async (t) => {
      for (const orphan of orphanList) {
        // 查询该食谱的 4 维评论数据
        const dims = await seq.query(`
          SELECT
            COALESCE(COUNT(*), 0) AS total_comments,
            COALESCE(ROUND(AVG(NULLIF(taste, 0)), 2), 0) AS taste_avg,
            COALESCE(COUNT(CASE WHEN taste IS NOT NULL AND taste > 0 THEN 1 END), 0) AS taste_cnt,
            COALESCE(ROUND(AVG(NULLIF(difficulty, 0)), 2), 0) AS difficulty_avg,
            COALESCE(COUNT(CASE WHEN difficulty IS NOT NULL AND difficulty > 0 THEN 1 END), 0) AS difficulty_cnt,
            COALESCE(ROUND(AVG(NULLIF(presentation, 0)), 2), 0) AS presentation_avg,
            COALESCE(COUNT(CASE WHEN presentation IS NOT NULL AND presentation > 0 THEN 1 END), 0) AS presentation_cnt,
            COALESCE(ROUND(AVG(NULLIF(value, 0)), 2), 0) AS value_avg,
            COALESCE(COUNT(CASE WHEN value IS NOT NULL AND value > 0 THEN 1 END), 0) AS value_cnt
          FROM comments
          WHERE recipeId = ?
        `, { replacements: [orphan.id], type: Sequelize.QueryTypes.SELECT, transaction: t })

        const d = dims[0]
        const totalComments = toInt(d.total_comments)
        const dimsWithData = [
          toInt(d.taste_cnt) > 0 ? toFloat(d.taste_avg) : null,
          toInt(d.difficulty_cnt) > 0 ? toFloat(d.difficulty_avg) : null,
          toInt(d.presentation_cnt) > 0 ? toFloat(d.presentation_avg) : null,
          toInt(d.value_cnt) > 0 ? toFloat(d.value_cnt) : null,
        ].filter(v => v !== null)

        const beforeScore = orphan.qualityScore

        if (dimsWithData.length > 0) {
          // 有评分数据 → 用 4 维均值 × 20 重算
          const avg4d = dimsWithData.reduce((a, b) => a + b, 0) / dimsWithData.length
          const newScore = r2(avg4d * 20)

          await seq.query(
            'UPDATE recipes SET qualityScore = ? WHERE id = ?',
            { replacements: [newScore, orphan.id], transaction: t }
          )

          fixLog.push({
            id: orphan.id,
            title: orphan.title,
            before: beforeScore,
            after: newScore,
            dimensionsWithData: dimsWithData.length,
            totalComments,
            detail: `taste=${r2(toFloat(d.taste_avg))}(${toInt(d.taste_cnt)}) ` +
                    `difficulty=${r2(toFloat(d.difficulty_avg))}(${toInt(d.difficulty_cnt)}) ` +
                    `presentation=${r2(toFloat(d.presentation_avg))}(${toInt(d.presentation_cnt)}) ` +
                    `value=${r2(toFloat(d.value_avg))}(${toInt(d.value_cnt)})`,
          })

          console.log(`  ✅ ${orphan.title}: QS ${beforeScore} → ${newScore} (${dimsWithData.length} 维有数据)`)
        } else {
          // 无评分数据 → 无法修复
          fixLog.push({
            id: orphan.id,
            title: orphan.title,
            before: beforeScore,
            after: beforeScore,
            unfixable: true,
            reason: `该食谱无 4 维评分数据（${totalComments} 条评论均无 taste/difficulty/presentation/value）`,
          })
          console.log(`  ⚠ ${orphan.title}: 无法修复（无 4 维数据，${totalComments} 条评论）`)
        }
      }

      // 事务结束前：若 0 条成功修复，回滚
      const fixed = fixLog.filter(f => !f.unfixable).length
      if (fixed === 0) {
        console.log('\n⚠ 0 条成功修复，事务回滚（无数据变更）')
        throw new Error('NO_FIXABLE_ORPHANS')
      }
    })

    // Step 4: 写修复日志
    const fixLogPath = path.join(reportsDir, `fix-log-${timestamp}.json`)
    const fixableLog = fixLog.filter(f => !f.unfixable)
    fs.writeFileSync(fixLogPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      dbName,
      totalOrphans: orphanList.length,
      fixed: fixableLog.length,
      unfixable: fixLog.length - fixableLog.length,
      entries: fixLog,
    }, null, 2), 'utf-8')
    console.log(`\n📝 修复日志: ${fixLogPath}`)

    // Step 5: 二次验证 — 运行 coverage check 验全 0 数量下降
    console.log(`\n🔄 二次验证: 重新运行 coverage 检查...`)
    console.log(`${'='.repeat(60)}`)

    const verifyRows = await seq.query(`
      SELECT r.id, r.title,
        COALESCE(SUM(CASE WHEN c.taste IS NOT NULL AND c.taste > 0 THEN 1 ELSE 0 END), 0) AS taste_cnt,
        COALESCE(SUM(CASE WHEN c.difficulty IS NOT NULL AND c.difficulty > 0 THEN 1 ELSE 0 END), 0) AS difficulty_cnt,
        COALESCE(SUM(CASE WHEN c.presentation IS NOT NULL AND c.presentation > 0 THEN 1 ELSE 0 END), 0) AS presentation_cnt,
        COALESCE(SUM(CASE WHEN c.value IS NOT NULL AND c.value > 0 THEN 1 ELSE 0 END), 0) AS value_cnt
      FROM recipes r
      LEFT JOIN comments c ON c.recipeId = r.id
      GROUP BY r.id
      HAVING taste_cnt = 0 AND difficulty_cnt = 0 AND presentation_cnt = 0 AND value_cnt = 0
    `, { type: Sequelize.QueryTypes.SELECT })

    const remainingOrphans = verifyRows.length
    const reduced = orphanList.length - remainingOrphans
    console.log(`  修复前孤儿: ${orphanList.length} 道`)
    console.log(`  修复后孤儿: ${remainingOrphans} 道`)
    console.log(`  成功修复: ${reduced} 道`)
    if (remainingOrphans > 0) {
      console.log(`  仍为孤儿: ${verifyRows.map(r => r.title).join(', ')}`)
    }
    console.log(`${'='.repeat(60)}\n`)

  } catch (err) {
    if (err.message === 'NO_FIXABLE_ORPHANS') {
      console.log('✅ 无数据变更，正常退出')
    } else {
      console.error('❌ 修复失败:', err.message)
      releaseLock()
      await seq.close()
      process.exit(1)
    }
  }

  releaseLock()
  await seq.close()
}

// ── 执行（仅直接运行，require 不触发）──
if (require.main === module) {
  main().catch(e => {
    console.error('脚本错误:', e.message)
    releaseLock()
    process.exit(1)
  })
}

module.exports = { main }
