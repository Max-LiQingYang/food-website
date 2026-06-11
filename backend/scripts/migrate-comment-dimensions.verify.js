#!/usr/bin/env node
/**
 * migrate-comment-dimensions.verify.js
 * 离线验证脚本：用 SQLite 内存数据库模拟迁移逻辑，验证输出统计
 *
 * 无需 MySQL，独立运行。
 *
 * 用法：
 *   cd backend && node scripts/migrate-comment-dimensions.verify.js
 */

'use strict'

const { Sequelize, DataTypes } = require('sequelize')

// ─────────────────────────────────────────────────────────────
// 确定性伪随机数生成器 (mulberry32) — 与主脚本一致
// ─────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0
    a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getPerturbation(commentId, dimIndex) {
  const seed = commentId * 100 + dimIndex * 37
  const rng = mulberry32(seed)
  const r1 = rng()
  const r2 = rng()
  return (r1 + r2 - 1.0)
}

function computeDimensionScores(commentId, overallRating) {
  const ranges = [
    { name: 'taste', minDev: 0.3, maxDev: 0.5 },
    { name: 'presentation', minDev: 0.4, maxDev: 0.7 },
    { name: 'value', minDev: 0.4, maxDev: 0.7 },
    { name: 'difficulty', minDev: 0.5, maxDev: 1.0 }
  ]

  const scores = {}
  for (let i = 0; i < ranges.length; i++) {
    const { minDev, maxDev } = ranges[i]
    const rawPert = getPerturbation(commentId, i)
    const absDev = minDev + (Math.abs(rawPert) * (maxDev - minDev))
    const sign = rawPert >= 0 ? 1 : -1
    const deviation = sign * absDev

    let score = overallRating + deviation
    score = Math.max(1, Math.min(5, score))
    score = Math.round(score)
    scores[ranges[i].name] = score
  }
  return scores
}

function shouldFillAllDimensions(commentId) {
  const rng = mulberry32(commentId * 991)
  return rng() < 0.90
}

function getNullDimensions(commentId) {
  const rng = mulberry32(commentId * 997)
  const allDims = ['taste', 'presentation', 'value', 'difficulty']
  const nullCount = Math.floor(rng() * 3) + 1
  const nullSet = new Set()
  const pool = [...allDims]
  for (let i = pool.length - 1; i > 0 && nullSet.size < nullCount; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  for (let i = 0; i < nullCount; i++) {
    nullSet.add(pool[i])
  }
  return nullSet
}

// ─────────────────────────────────────────────────────────────
// 主验证流程
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🧪 migrate-comment-dimensions 离线验证\n')

  // 1) 创建 SQLite 内存数据库
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  })

  const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: true },
    taste: { type: DataTypes.INTEGER, allowNull: true },
    difficulty: { type: DataTypes.INTEGER, allowNull: true },
    presentation: { type: DataTypes.INTEGER, allowNull: true },
    value: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    recipeId: { type: DataTypes.STRING, allowNull: false }
  }, { tableName: 'comments', timestamps: false })

  await sequelize.sync({ force: true })

  // 2) 种子 50 条模拟评论（rating 分布覆盖 1-5）
  console.log('📊 种子 50 条模拟评论...')
  const ratingDistribution = [
    1, 1, 1, 1,                            // 4 条 rating=1
    2, 2, 2, 2, 2, 2,                       // 6 条 rating=2
    3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,   // 12 条 rating=3
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, // 15 条 rating=4
    5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5  // 13 条 rating=5
  ]

  for (let i = 0; i < ratingDistribution.length; i++) {
    await Comment.create({
      content: `测试评论 #${i + 1}`,
      rating: ratingDistribution[i],
      taste: null,
      difficulty: null,
      presentation: null,
      value: null,
      userId: 'test-user-uuid',
      recipeId: 'test-recipe-uuid'
    })
  }

  // 再加 3 条无 rating 的评论
  for (let i = 0; i < 3; i++) {
    await Comment.create({
      content: `无评分评论 #${i + 1}`,
      rating: null,
      taste: null,
      difficulty: null,
      presentation: null,
      value: null,
      userId: 'test-user-uuid',
      recipeId: 'test-recipe-uuid'
    })
  }

  // 3) 读取并处理
  const allComments = await Comment.findAll({ order: [['id', 'ASC']] })
  const total = allComments.length
  console.log(`  共 ${total} 条评论 (含 ${ratingDistribution.length} 条有评分, 3 条无评分)\n`)

  let updatedCount = 0
  let fullyFilledCount = 0
  let partiallyFilledCount = 0
  let nullRatingCount = 0
  const dimSums = { taste: 0, difficulty: 0, presentation: 0, value: 0 }
  const dimCounts = { taste: 0, difficulty: 0, presentation: 0, value: 0 }

  console.log('📋 前 10 条抽样检查:')
  console.log('  ID   rating  taste  difficulty  presentation  value')
  console.log('  ───  ──────  ─────  ──────────  ────────────  ─────')

  for (const c of allComments) {
    if (c.rating == null) {
      nullRatingCount++
      continue
    }

    const id = c.id
    const rating = c.rating
    const scores = computeDimensionScores(id, rating)
    const fillAll = shouldFillAllDimensions(id)

    let taste, difficulty, presentation, value
    if (fillAll) {
      taste = scores.taste
      difficulty = scores.difficulty
      presentation = scores.presentation
      value = scores.value
      fullyFilledCount++
    } else {
      const nullDims = getNullDimensions(id)
      taste = nullDims.has('taste') ? null : scores.taste
      difficulty = nullDims.has('difficulty') ? null : scores.difficulty
      presentation = nullDims.has('presentation') ? null : scores.presentation
      value = nullDims.has('value') ? null : scores.value
      const filledCount = [taste, difficulty, presentation, value].filter(v => v != null).length
      if (filledCount > 0) partiallyFilledCount++
    }

    // 更新维度求和
    for (const [dim, val] of Object.entries({ taste, difficulty, presentation, value })) {
      if (val != null) {
        dimSums[dim] += val
        dimCounts[dim]++
      }
    }

    // 打印前 10 条
    if (updatedCount < 10) {
      console.log(`  ${String(id).padEnd(4)} ${String(rating).padEnd(6)} ${String(taste).padEnd(5)} ${String(difficulty).padEnd(10)} ${String(presentation).padEnd(12)} ${String(value).padEnd(5)}`)
    }

    // UPDATE
    await Comment.update(
      { taste, difficulty, presentation, value },
      { where: { id } }
    )
    updatedCount++
  }

  // 4) 验证：重新读取确认数据已写回
  const verified = await Comment.findAll({
    where: { rating: { [Sequelize.Op.ne]: null } },
    attributes: ['id', 'taste', 'difficulty', 'presentation', 'value']
  })

  const verifiedNullCount = verified.filter(c =>
    c.taste == null || c.difficulty == null || c.presentation == null || c.value == null
  ).length
  const verifiedFullCount = verified.length - verifiedNullCount

  // ── 统计输出 ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════')
  console.log('📈 验证统计')
  console.log('═══════════════════════════════════')
  console.log(`  评论总数:            ${total}`)
  console.log(`  有 overall rating:   ${total - nullRatingCount}`)
  console.log(`  无 overall rating:   ${nullRatingCount}`)
  console.log(`  实际更新:            ${updatedCount}`)
  console.log(`  四维全填:            ${fullyFilledCount} (${((fullyFilledCount / updatedCount) * 100).toFixed(1)}%)`)
  console.log(`  部分填充:            ${partiallyFilledCount} (${((partiallyFilledCount / updatedCount) * 100).toFixed(1)}%)`)
  console.log(`  填充率:              ${((fullyFilledCount / updatedCount) * 100).toFixed(1)}% ≥ 90%? ${(fullyFilledCount / updatedCount) >= 0.9 ? '✅' : '❌'}`)

  console.log('\n  数据库验证 (重新读取):')
  console.log(`    四维全填: ${verifiedFullCount} / ${verified.length}`)
  console.log(`    部分 NULL: ${verifiedNullCount} / ${verified.length}`)

  console.log('\n  四维平均分:')
  const rangeCheck = []
  for (const dim of Object.keys(dimSums)) {
    const avg = dimCounts[dim] > 0 ? (dimSums[dim] / dimCounts[dim]).toFixed(2) : 'N/A'
    const label = { taste: '口味', difficulty: '难度', presentation: '卖相', value: '性价比' }[dim]
    console.log(`    ${label}(${dim}): ${avg} (count=${dimCounts[dim]})`)
    if (dimCounts[dim] > 0) {
      const avgVal = dimSums[dim] / dimCounts[dim]
      rangeCheck.push(avgVal >= 3.0 && avgVal <= 4.5)
    }
  }
  const allInRange = rangeCheck.every(Boolean)
  console.log(`  平均分 ∈ [3.0, 4.5]: ${allInRange ? '✅' : '⚠️'}`)

  // 5) 幂等性验证 — 重新计算一遍，确认结果一致
  console.log('\n🔁 幂等性验证（重新计算）...')
  const comments2 = await Comment.findAll({
    where: { rating: { [Sequelize.Op.ne]: null } },
    order: [['id', 'ASC']]
  })
  let idempotent = true
  for (const c of comments2) {
    const scores = computeDimensionScores(c.id, c.rating)
    const fillAll = shouldFillAllDimensions(c.id)
    let expected
    if (fillAll) {
      expected = scores
    } else {
      const nullDims = getNullDimensions(c.id)
      expected = {}
      for (const dim of Object.keys(scores)) {
        expected[dim] = nullDims.has(dim) ? null : scores[dim]
      }
    }
    if (c.taste !== expected.taste || c.difficulty !== expected.difficulty ||
      c.presentation !== expected.presentation || c.value !== expected.value) {
      idempotent = false
      console.log(`  ❌ #${c.id} 不匹配: DB(${c.taste},${c.difficulty},${c.presentation},${c.value}) vs Calc(${expected.taste},${expected.difficulty},${expected.presentation},${expected.value})`)
      break
    }
  }
  console.log(`  幂等性: ${idempotent ? '✅ 一致' : '❌ 不一致'}`)

  // 6) 边界验证
  console.log('\n🔍 边界验证...')
  const allFilled = await Comment.findAll({
    where: { taste: { [Sequelize.Op.ne]: null } },
    attributes: ['id', 'taste', 'difficulty', 'presentation', 'value']
  })
  let outOfRange = []
  for (const c of allFilled) {
    for (const dim of ['taste', 'difficulty', 'presentation', 'value']) {
      if (c[dim] == null) continue // 允许 NULL（设计如此）
      if (c[dim] < 1 || c[dim] > 5 || !Number.isInteger(c[dim])) {
        outOfRange.push(`#${c.id} ${dim}=${c[dim]}`)
      }
    }
  }
  console.log(`  越界值: ${outOfRange.length === 0 ? '✅ 无' : '❌ ' + outOfRange.join(', ')}`)

  console.log('\n✅ 离线验证完成！')
  await sequelize.close()
}

main().catch(err => {
  console.error('❌ 验证失败:', err.message)
  console.error(err.stack)
  process.exit(1)
})
