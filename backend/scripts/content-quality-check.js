#!/usr/bin/env node
'use strict'

/**
 * content-quality-check.js — 内容质量诊断脚本（只读）
 *
 * 遍历所有 Recipe，按 PRD §1 的 8 维度打分（满分 100），输出质量报告。
 *
 * 用法：node scripts/content-quality-check.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { Sequelize } = require('sequelize')

// ── 合法枚举值 ─────────────────────────────────────────────
const VALID_CATEGORIES = ['chinese', 'western', 'japanese', 'korean', 'dessert', 'thai', 'indian', 'vietnamese', 'mexican', 'mediterranean', 'other']
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all']

// ── 感官词库 ───────────────────────────────────────────────
const SENSORY_WORDS = [
  '香', '酥', '嫩', '鲜', '滑', '脆', '软', '糯', '浓', '醇',
  '弹', '爽', '辣', '麻', '甜', '酸', '咸', '苦', '甘',
  'Q弹', '入口即化', '外酥里嫩', '鲜嫩多汁', '肥而不腻', '麻辣鲜香',
  '酸甜可口', '回味无穷', '唇齿留香', '色香味俱全', '垂涎欲滴',
  '食指大动', '鲜美无比', '浓郁醇厚', '清爽可口',
]

// ── 量化关键词 ─────────────────────────────────────────────
const QUANTIFY_KEYWORDS = [
  '分钟', '小时', '秒', '度', '℃', '°C', '克', 'g', '毫升', 'ml',
  '大火', '中火', '小火', '文火', '猛火', '预热', '°F', '华氏',
  '汤匙', '茶匙',
]

// ── 评分函数 ───────────────────────────────────────────────

/** 1.1 必填字段完整性（10分） */
function scoreRequiredFields(recipe) {
  let score = 0
  const missing = []

  // title（3分）
  if (recipe.title && recipe.title.trim().length >= 2) {
    score += 3
  } else {
    missing.push('标题缺失或过短')
  }

  // description（3分）
  if (recipe.description && recipe.description.trim().length > 0) {
    score += 3
  } else {
    missing.push('描述缺失')
  }

  // ingredients（2分）
  const ingredients = parseJSON(recipe.ingredients)
  if (Array.isArray(ingredients) && ingredients.length >= 1) {
    score += 2
  } else {
    missing.push('食材列表缺失')
  }

  // steps（2分）
  const steps = parseJSON(recipe.steps)
  if (Array.isArray(steps) && steps.length >= 1) {
    score += 2
  } else {
    missing.push('步骤缺失')
  }

  return { score, max: 10, missing }
}

/** 1.2 图片质量（15分） */
function scoreImageQuality(recipe) {
  let score = 0
  const missing = []

  // 图片存在（5分）
  if (recipe.coverImage && recipe.coverImage.trim().length > 0) {
    score += 5
  } else {
    missing.push('无封面图')
  }

  // URL 格式合法（5分）
  if (recipe.coverImage && /^https?:\/\//i.test(recipe.coverImage.trim())) {
    score += 5
  } else if (recipe.coverImage) {
    missing.push('图片URL格式不合法')
  } else {
    missing.push('图片URL格式不合法')
  }

  // 非占位图（5分）
  if (recipe.coverImage && recipe.coverImage.includes('placehold.co')) {
    missing.push('使用占位图')
  } else if (recipe.coverImage && /^https?:\/\//i.test(recipe.coverImage.trim())) {
    score += 5
  } else {
    missing.push('使用占位图')
  }

  return { score, max: 15, missing }
}

/** 1.3 描述吸引力（15分） */
function scoreDescription(recipe) {
  let score = 0
  const missing = []
  const desc = recipe.description || ''
  const charCount = desc.replace(/\s/g, '').length

  // 字数 ≥ 50（5分）
  if (charCount >= 50) {
    score += 5
  } else if (charCount >= 20) {
    missing.push('描述偏短(<50字)')
  } else {
    missing.push('描述太短(<20字)')
  }

  // 描述具体/包含食材/口味关键词（5分）
  if (charCount >= 20) {
    score += 5
  } else if (charCount > 0) {
    score += 2
    missing.push('描述不够具体')
  } else {
    missing.push('描述不够具体')
  }

  // 感官词（5分）
  const hasSensory = SENSORY_WORDS.some(w => desc.includes(w))
  if (hasSensory) {
    score += 5
  } else {
    missing.push('缺乏感官描述词')
  }

  return { score, max: 15, missing }
}

/** 1.4 食材列表清晰度（15分） */
function scoreIngredients(recipe) {
  let score = 0
  const missing = []
  const ingredients = parseJSON(recipe.ingredients)

  if (!Array.isArray(ingredients)) {
    missing.push('食材列表无法解析')
    return { score, max: 15, missing }
  }

  // 数量 ≥ 3（5分）
  if (ingredients.length >= 3) {
    score += 5
  } else if (ingredients.length >= 1) {
    score += 2
    missing.push('食材数量不足(<3)')
  } else {
    missing.push('食材数量不足(<3)')
  }

  // 分组结构（5分）
  const hasGroup = ingredients.some(item => {
    if (!item || typeof item !== 'object') return false
    return !!(item.category || item.group || item.section ||
      (item.groupName) ||
      /主料|辅料|调料|腌料|酱汁/.test(JSON.stringify(item)))
  })
  if (hasGroup) {
    score += 5
  } else {
    missing.push('无食材分组')
  }

  // 每条有 name + amount + unit（5分）
  if (ingredients.length > 0) {
    const withDetails = ingredients.filter(item => {
      if (!item || typeof item !== 'object') return false
      return item.name && item.amount && item.unit
    })
    const ratio = withDetails.length / ingredients.length
    if (ratio >= 0.7) {
      score += 5
    } else if (ratio >= 0.3) {
      score += 3
      missing.push('部分食材缺数量/单位')
    } else {
      missing.push('多数食材缺数量/单位')
    }
  }

  return { score, max: 15, missing }
}

/** 1.5 步骤详细度（15分） */
function scoreSteps(recipe) {
  let score = 0
  const missing = []
  const steps = parseJSON(recipe.steps)

  if (!Array.isArray(steps)) {
    missing.push('步骤无法解析')
    return { score, max: 15, missing }
  }

  // 步骤数量 ≥ 3（5分）
  if (steps.length >= 3) {
    score += 5
  } else if (steps.length >= 1) {
    score += 2
    missing.push('步骤数量不足(<3)')
  } else {
    missing.push('步骤数量不足(<3)')
  }

  // 平均每步字数 ≥ 15（5分）
  if (steps.length > 0) {
    const allContent = steps.map(s => {
      if (typeof s === 'object' && s.content) return s.content
      if (typeof s === 'string') return s
      return ''
    })
    const avgLen = allContent.reduce((sum, c) => sum + c.replace(/\s/g, '').length, 0) / allContent.length
    if (avgLen >= 15) {
      score += 5
    } else if (avgLen >= 8) {
      score += 3
      missing.push('步骤描述偏短(均<15字)')
    } else {
      missing.push('步骤描述太短(均<8字)')
    }
  }

  // 量化信息（5分）
  const stepTexts = steps.map(s => {
    if (typeof s === 'object' && s.content) return s.content
    if (typeof s === 'string') return s
    return ''
  }).join(' ')
  const hasQuantify = QUANTIFY_KEYWORDS.some(kw => stepTexts.includes(kw)) ||
    /\d+[°℃度分钟秒克gml]/.test(stepTexts)
  if (hasQuantify) {
    score += 5
  } else {
    missing.push('步骤缺少量化信息(温度/时间/火候)')
  }

  return { score, max: 15, missing }
}

/** 1.6 烹饪技巧/tips（10分） */
function scoreTips(recipe) {
  let score = 0
  const missing = []
  const tips = recipe.tips || ''

  // tips 存在（5分）
  if (tips && tips.trim().length > 0) {
    score += 5
  } else {
    missing.push('无烹饪技巧/tips')
    return { score, max: 10, missing }
  }

  // tips 实用（字数 ≥ 20）（5分）
  const charCount = tips.replace(/\s/g, '').length
  if (charCount >= 20) {
    score += 5
  } else {
    missing.push('tips内容偏短(<20字)')
  }

  return { score, max: 10, missing }
}

/** 1.7 营养信息完整（10分） */
function scoreNutrition(recipe) {
  let score = 0
  const missing = []
  const nutrition = parseJSON(recipe.nutrition)

  if (!nutrition || typeof nutrition !== 'object') {
    missing.push('营养信息缺失')
    return { score, max: 10, missing }
  }

  // 热量（3分）
  if (typeof nutrition.calories === 'number' && nutrition.calories > 0) {
    score += 3
  } else {
    missing.push('热量缺失')
  }

  // 蛋白质（2分）
  if (nutrition.protein !== undefined && nutrition.protein !== null) {
    score += 2
  } else {
    missing.push('蛋白质缺失')
  }

  // 脂肪（2分）
  if (nutrition.fat !== undefined && nutrition.fat !== null) {
    score += 2
  } else {
    missing.push('脂肪缺失')
  }

  // 碳水（2分）
  if (nutrition.carbs !== undefined && nutrition.carbs !== null) {
    score += 2
  } else {
    missing.push('碳水缺失')
  }

  // 膳食纤维（1分）
  if (nutrition.fiber !== undefined && nutrition.fiber !== null) {
    score += 1
  } else {
    missing.push('膳食纤维缺失')
  }

  return { score, max: 10, missing }
}

/** 1.8 分类与季节标签准确（10分） */
function scoreCategoryAndSeason(recipe) {
  let score = 0
  const missing = []

  // category 合规（4分）
  if (recipe.category && VALID_CATEGORIES.includes(recipe.category)) {
    score += 4
  } else {
    missing.push(`分类不合规(${recipe.category || 'NULL'})`)
  }

  // season 合规（3分）
  if (recipe.season && VALID_SEASONS.includes(recipe.season)) {
    score += 3
  } else {
    missing.push(`季节标签不合规(${recipe.season || 'NULL'})`)
  }

  // difficulty 合规（3分）
  if (recipe.difficulty && VALID_DIFFICULTIES.includes(recipe.difficulty)) {
    score += 3
  } else {
    missing.push(`难度标签不合规(${recipe.difficulty || 'NULL'})`)
  }

  return { score, max: 10, missing }
}

// ── 工具函数 ───────────────────────────────────────────────
function parseJSON(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
}

function getGrade(score) {
  if (score >= 90) return '⭐⭐⭐⭐⭐'
  if (score >= 75) return '⭐⭐⭐⭐'
  if (score >= 60) return '⭐⭐⭐'
  if (score >= 40) return '⭐⭐'
  return '⭐'
}

function getGradeRange(score) {
  if (score >= 90) return '90-100分'
  if (score >= 75) return '75-89分'
  if (score >= 60) return '60-74分'
  if (score >= 40) return '40-59分'
  return '0-39分'
}

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  const sequelize = new Sequelize({
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'food_website',
    username: process.env.DB_USER || 'food_user',
    password: process.env.DB_PASS || 'food_password',
    dialect: 'mysql',
    dialectModule: require('mysql2'),
    logging: false,
  })

  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    // 直接用 SQL 读取所有食谱（避免 getter 干扰 raw 数据）
    const [rawRecipes] = await sequelize.query(
      'SELECT * FROM recipes ORDER BY title'
    )
    console.log(`📊 共 ${rawRecipes.length} 道食谱\n`)

    // 对每道食谱打分
    const results = []
    for (const row of rawRecipes) {
      // 构造一个类似 model instance 的对象（让 getter 正常工作）
      const recipe = {
        ...row,
        // 手动解析 JSON 字段（raw SQL 返回的是字符串）
        ingredients: parseJSON(row.ingredients),
        steps: parseJSON(row.steps),
        nutrition: parseJSON(row.nutrition),
      }

      const d1 = scoreRequiredFields(recipe)
      const d2 = scoreImageQuality(recipe)
      const d3 = scoreDescription(recipe)
      const d4 = scoreIngredients(recipe)
      const d5 = scoreSteps(recipe)
      const d6 = scoreTips(recipe)
      const d7 = scoreNutrition(recipe)
      const d8 = scoreCategoryAndSeason(recipe)

      const totalScore = d1.score + d2.score + d3.score + d4.score + d5.score + d6.score + d7.score + d8.score
      const allMissing = [...d1.missing, ...d2.missing, ...d3.missing, ...d4.missing, ...d5.missing, ...d6.missing, ...d7.missing, ...d8.missing]

      results.push({
        id: row.id,
        title: row.title,
        totalScore,
        dimensions: { d1, d2, d3, d4, d5, d6, d7, d8 },
        missing: allMissing,
      })
    }

    // 按分数从低到高排序
    results.sort((a, b) => a.totalScore - b.totalScore)

    // ── 汇总统计 ────────────────────────────────────────────
    const totalScoreSum = results.reduce((s, r) => s + r.totalScore, 0)
    const avgScore = results.length > 0 ? (totalScoreSum / results.length).toFixed(1) : '0.0'

    const gradeDistribution = { '⭐⭐⭐⭐⭐': 0, '⭐⭐⭐⭐': 0, '⭐⭐⭐': 0, '⭐⭐': 0, '⭐': 0 }
    for (const r of results) {
      gradeDistribution[getGrade(r.totalScore)]++
    }

    console.log('===== 内容质量报告 =====')
    console.log(`总分: ${totalScoreSum} / ${results.length * 100} | 平均分: ${avgScore}`)
    console.log()
    console.log('等级分布:')
    console.log(`  ⭐⭐⭐⭐⭐ (90-100分): ${gradeDistribution['⭐⭐⭐⭐⭐']} 道`)
    console.log(`  ⭐⭐⭐⭐ (75-89分): ${gradeDistribution['⭐⭐⭐⭐']} 道`)
    console.log(`  ⭐⭐⭐ (60-74分): ${gradeDistribution['⭐⭐⭐']} 道`)
    console.log(`  ⭐⭐ (40-59分): ${gradeDistribution['⭐⭐']} 道`)
    console.log(`  ⭐ (0-39分): ${gradeDistribution['⭐']} 道`)
    console.log()

    // 低分食谱前10名
    console.log('低分食谱（前10名）:')
    const lowScore = results.slice(0, 10)
    lowScore.forEach((r, i) => {
      const missingStr = r.missing.length > 0 ? r.missing.slice(0, 5).join(', ') : '无'
      console.log(`  ${i + 1}. [${r.title}] - ${r.totalScore}分 - 缺失: ${missingStr}`)
    })
    console.log()

    // ── 详细评分 ────────────────────────────────────────────
    console.log('===== 详细评分（按分数从低到高排序）=====')
    for (const r of results) {
      const d = r.dimensions
      console.log(`[${r.id?.slice(0, 8)}...] ${r.title}`)
      console.log(`  总分: ${r.totalScore}/100 ${getGrade(r.totalScore)} (${getGradeRange(r.totalScore)})`)
      console.log(`  必填字段: ${d.d1.score}/${d.d1.max}  图片质量: ${d.d2.score}/${d.d2.max}  描述吸引力: ${d.d3.score}/${d.d3.max}`)
      console.log(`  食材清晰度: ${d.d4.score}/${d.d4.max}  步骤详细度: ${d.d5.score}/${d.d5.max}  烹饪技巧: ${d.d6.score}/${d.d6.max}`)
      console.log(`  营养信息: ${d.d7.score}/${d.d7.max}  分类与季节: ${d.d8.score}/${d.d8.max}`)
      if (r.missing.length > 0) {
        console.log(`  缺失项: ${r.missing.join(', ')}`)
      }
      console.log()
    }

  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()
