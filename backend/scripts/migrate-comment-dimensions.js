#!/usr/bin/env node
/**
 * migrate-comment-dimensions.js
 * 一次性迁移脚本：为存量评论生成四维评分数据（幂等）
 *
 * 背景：
 *   功能代码（路由 /api/recipes/:recipeId/comments/stats 和聚合 dimensionAverages）
 *   已在迭代 #130/#132 上线，但 comment 表里 taste/difficulty/presentation/value 对于
 *   存量评论全部为 NULL，DimensionRadar 雷达图显示空数据。
 *
 * 策略：
 *   1. 基于该评论的 overall rating 字段（1-5 整数）作为基准
 *   2. 4 个维度都贴近 overall 但加少量扰动体现真实感：
 *      - taste 偏离最小（口味最直接）：    dev ∈ [0.3, 0.5]
 *      - presentation 中等（卖相主观）：   dev ∈ [0.4, 0.7]
 *      - value 中等（性价比主观）：         dev ∈ [0.4, 0.7]
 *      - difficulty 偏离最大（难度主观）：  dev ∈ [0.5, 1.0]
 *   3. 扰动后 clamp 到 [1, 5]，取整到整数
 *   4. ≥90% 的评论四维全填，余下 10% 允许部分 NULL
 *   5. 使用基于 comment.id 的确定性伪随机，保证幂等性
 *
 * 用法：
 *   cd backend && node scripts/migrate-comment-dimensions.js
 *
 * 幂等性：
 *   重新执行会覆盖原值，因为使用确定性 PRNG，统计输出一致。
 */

'use strict'

const { sequelize } = require('../models')

// ─────────────────────────────────────────────────────────────
// 确定性伪随机数生成器 (mulberry32)
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

/**
 * 基于 comment.id 生成指定维度的扰动值
 * @param {number} commentId
 * @param {number} dimIndex - 0=taste, 1=presentation, 2=value, 3=difficulty
 * @returns {number} 扰动值 ∈ [-1.0, 1.0]
 */
function getPerturbation(commentId, dimIndex) {
  // 每个维度用不同的种子偏移，避免 4 维完全同步
  const seed = commentId * 100 + dimIndex * 37
  const rng = mulberry32(seed)
  // 用两次 rng 使分布更均匀
  const r1 = rng()
  const r2 = rng()
  // 映射到 [-1, 1] 范围
  return (r1 + r2 - 1.0)
}

/**
 * 计算单个评论的 4 维评分
 * @param {number} commentId
 * @param {number} overallRating - 综合评分 (1-5)
 * @returns {{ taste: number, difficulty: number, presentation: number, value: number }}
 */
function computeDimensionScores(commentId, overallRating) {
  // 各维度扰动范围
  const ranges = [
    { name: 'taste', minDev: 0.3, maxDev: 0.5 },        // 口味 → 最小偏离
    { name: 'presentation', minDev: 0.4, maxDev: 0.7 },  // 卖相 → 中等
    { name: 'value', minDev: 0.4, maxDev: 0.7 },          // 性价比 → 中等
    { name: 'difficulty', minDev: 0.5, maxDev: 1.0 }      // 难度 → 最大偏离
  ]

  const scores = {}
  for (let i = 0; i < ranges.length; i++) {
    const { minDev, maxDev } = ranges[i]
    const rawPert = getPerturbation(commentId, i)
    // 将 [-1, 1] 映射到 [minDev, maxDev] 带符号
    const absDev = minDev + (Math.abs(rawPert) * (maxDev - minDev))
    const sign = rawPert >= 0 ? 1 : -1
    const deviation = sign * absDev

    let score = overallRating + deviation
    // clamp 到 [1, 5]
    score = Math.max(1, Math.min(5, score))
    // 四舍五入到整数
    score = Math.round(score)

    scores[ranges[i].name] = score
  }
  return scores
}

/**
 * 确定性判断：该评论是否应填充全部 4 维（≥90%）
 */
function shouldFillAllDimensions(commentId) {
  const rng = mulberry32(commentId * 991)
  return rng() < 0.90
}

/**
 * 对 10% 未全填的评论，确定性选择哪些维度留 NULL
 * 保证至少有 1 个维度有值（不产生全 NULL）
 */
function getNullDimensions(commentId) {
  const rng = mulberry32(commentId * 997)
  const allDims = ['taste', 'presentation', 'value', 'difficulty']
  // 随机决定留 NULL 的数量：1-3
  const nullCount = Math.floor(rng() * 3) + 1 // 1, 2, or 3
  const nullSet = new Set()
  // Fisher-Yates shuffle to pick nullCount dims
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
// 主流程
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 migrate-comment-dimensions: 开始回填四维评分数据\n')

  // 1) 读取所有 comments（含 rating）
  const [rows] = await sequelize.query(
    'SELECT id, rating FROM comments ORDER BY id'
  )

  const total = rows.length
  if (total === 0) {
    console.log('⚠️  comments 表为空，无需处理')
    return
  }

  // #127 经验：MySQL raw query 返回数值可能是字符串，需 parseInt
  const comments = rows.map(r => ({
    id: parseInt(r.id, 10),
    rating: r.rating != null ? parseInt(r.rating, 10) : null
  }))

  console.log(`📊 共 ${total} 条评论`)

  let updatedCount = 0
  let fullyFilledCount = 0
  let partiallyFilledCount = 0
  let nullRatingCount = 0
  const dimSums = { taste: 0, difficulty: 0, presentation: 0, value: 0 }
  const dimCounts = { taste: 0, difficulty: 0, presentation: 0, value: 0 }

  // 抽样前 10 条用于验证输出
  const sampleIds = comments.slice(0, 10).map(c => c.id)

  for (const { id, rating } of comments) {
    if (rating == null) {
      nullRatingCount++
      continue // 无 overall rating 的评论跳过
    }

    const scores = computeDimensionScores(id, rating)
    const fillAll = shouldFillAllDimensions(id)

    let updates
    if (fillAll) {
      // 全部维度填充
      updates = scores
      fullyFilledCount++
    } else {
      // 部分维度留 NULL
      const nullDims = getNullDimensions(id)
      updates = {}
      let filledCount = 0
      for (const dim of Object.keys(scores)) {
        if (nullDims.has(dim)) {
          updates[dim] = null
        } else {
          updates[dim] = scores[dim]
          filledCount++
        }
      }
      if (filledCount > 0) partiallyFilledCount++
    }

    // 更新维度求和
    for (const dim of Object.keys(dimSums)) {
      if (updates[dim] != null) {
        dimSums[dim] += updates[dim]
        dimCounts[dim]++
      }
    }

    // 抽检前 10 条
    if (sampleIds.includes(id)) {
      console.log(`  #${id}  rating=${rating} → taste=${updates.taste} difficulty=${updates.difficulty} presentation=${updates.presentation} value=${updates.value}`)
    }

    // UPDATE
    await sequelize.query(
      'UPDATE comments SET taste = ?, difficulty = ?, presentation = ?, value = ? WHERE id = ?',
      {
        replacements: [updates.taste, updates.difficulty, updates.presentation, updates.value, id]
      }
    )
    updatedCount++
  }

  // ── 统计输出 ──────────────────────────────────────────────
  console.log('\n═══════════════════════════════════')
  console.log('📈 迁移统计')
  console.log('═══════════════════════════════════')
  console.log(`  评论总数:            ${total}`)
  console.log(`  有 overall rating:   ${total - nullRatingCount}`)
  console.log(`  无 overall rating:   ${nullRatingCount}`)
  console.log(`  实际更新:            ${updatedCount}`)
  console.log(`  四维全填:            ${fullyFilledCount} (${((fullyFilledCount / updatedCount) * 100).toFixed(1)}%)`)
  console.log(`  部分填充:            ${partiallyFilledCount} (${((partiallyFilledCount / updatedCount) * 100).toFixed(1)}%)`)
  console.log(`  填充率:              ${((fullyFilledCount / updatedCount) * 100).toFixed(1)}% ≥ 90%? ${(fullyFilledCount / updatedCount) >= 0.9 ? '✅' : '❌'}`)

  console.log('\n  四维平均分:')
  for (const dim of Object.keys(dimSums)) {
    const avg = dimCounts[dim] > 0 ? (dimSums[dim] / dimCounts[dim]).toFixed(2) : 'N/A'
    const label = { taste: '口味', difficulty: '难度', presentation: '卖相', value: '性价比' }[dim]
    console.log(`    ${label}(${dim}): ${avg} (count=${dimCounts[dim]})`)
  }

  // 验证平均分在合理区间 [3.0, 4.5]
  let allInRange = true
  for (const dim of Object.keys(dimSums)) {
    const avg = dimCounts[dim] > 0 ? dimSums[dim] / dimCounts[dim] : 0
    if (dimCounts[dim] > 0 && (avg < 3.0 || avg > 4.5)) {
      allInRange = false
    }
  }
  console.log(`  平均分 ∈ [3.0, 4.5]: ${allInRange ? '✅' : '⚠️'}`)

  console.log('\n✅ 迁移完成！')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 迁移失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  })
