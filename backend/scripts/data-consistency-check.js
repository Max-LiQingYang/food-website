#!/usr/bin/env node
'use strict'

/**
 * data-consistency-check.js — 数据一致性诊断脚本（只读）
 *
 * 按 PRD §3 的规则检查数据一致性：
 * - C-001~006：分类标签合规性
 * - S-001~006：季节标签合理性
 * - D-001~006：难度标签与实际步骤匹配
 *
 * 用法：node scripts/data-consistency-check.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { Sequelize } = require('sequelize')

// ── 合法枚举值 ─────────────────────────────────────────────
const VALID_CATEGORIES = ['chinese', 'western', 'japanese', 'korean', 'dessert', 'thai', 'indian', 'vietnamese', 'mexican', 'mediterranean', 'other']
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all']

// ── 季节关键词映射 ─────────────────────────────────────────
const SEASON_TITLE_KEYWORDS = {
  spring: ['春'],
  summer: ['夏', '凉', '冰'],
  autumn: ['秋'],
  winter: ['冬', '暖', '炖', '煲'],
}

const SEASONAL_INGREDIENTS = {
  spring: ['春笋', '香椿', '荠菜', '蚕豆', '豌豆苗', '草莓', '樱桃'],
  summer: ['西瓜', '苦瓜', '冬瓜', '丝瓜', '绿豆', '荷叶', '莲藕'],
  autumn: ['螃蟹', '南瓜', '板栗', '山药', '柿子', '柚子', '梨'],
  winter: ['羊肉', '萝卜', '白菜', '冬笋', '腊肉', '火锅'],
}

// ── 特殊技巧关键词 ─────────────────────────────────────────
const SPECIAL_TECHNIQUES = [
  '发酵', '打发', '揉面', '擀面', '裱花', '拉糖', '翻糖', '酥皮', '开酥',
  '水浴', '隔水', '油温', '糖色', '勾芡', '挂糊', '上浆', '焯水', '过油',
  '收汁', '拔丝', '挂霜',
]

// ── 工具函数 ───────────────────────────────────────────────
function parseJSON(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
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

    const [rawRecipes] = await sequelize.query('SELECT * FROM recipes ORDER BY title')
    console.log(`📊 共 ${rawRecipes.length} 道食谱\n`)

    const errors = []    // 🔴
    const warnings = []  // 🟡
    const suggestions = [] // 🔵

    for (const row of rawRecipes) {
      const recipe = {
        ...row,
        ingredients: parseJSON(row.ingredients),
        steps: parseJSON(row.steps),
        categoryTags: parseJSON(row.categoryTags),
      }
      const title = recipe.title || '(无标题)'
      const id = recipe.id

      // ── C-001: category 必须为合法枚举值 ────────────────
      if (!recipe.category || !VALID_CATEGORIES.includes(recipe.category)) {
        errors.push({ rule: 'C-001', id, title, detail: `category="${recipe.category || 'NULL'}" 不在合法枚举值内` })
      }

      // ── C-002: category 为 other 时应检查 categoryTags ──
      if (recipe.category === 'other') {
        const ct = recipe.categoryTags
        if (!ct || !ct.cuisine || ct.cuisine === 'other') {
          warnings.push({ rule: 'C-002', id, title, detail: 'category=other 但 categoryTags.cuisine 无更精确分类' })
        }
      }

      // ── C-003: difficulty 合规 ───────────────────────────
      if (!recipe.difficulty || !VALID_DIFFICULTIES.includes(recipe.difficulty)) {
        errors.push({ rule: 'C-003', id, title, detail: `difficulty="${recipe.difficulty || 'NULL'}" 不在合法枚举值内` })
      }

      // ── C-004: season 合规 ──────────────────────────────
      if (!recipe.season || !VALID_SEASONS.includes(recipe.season)) {
        errors.push({ rule: 'C-004', id, title, detail: `season="${recipe.season || 'NULL'}" 不在合法枚举值内` })
      }

      // ── C-005: categoryTags 必须为合法 JSON ─────────────
      if (row.categoryTags) {
        const parsed = parseJSON(row.categoryTags)
        if (!parsed || typeof parsed !== 'object') {
          errors.push({ rule: 'C-005', id, title, detail: 'categoryTags JSON 解析失败' })
        }
      }

      // ── C-006: categoryTags.cuisine 与 category 一致 ────
      if (recipe.categoryTags && recipe.category && recipe.category !== 'other') {
        const ctCuisine = recipe.categoryTags.cuisine
        if (ctCuisine && ctCuisine !== recipe.category && ctCuisine !== 'other') {
          warnings.push({ rule: 'C-006', id, title, detail: `categoryTags.cuisine="${ctCuisine}" 与 category="${recipe.category}" 不一致` })
        }
      }

      // ── 季节标签合理性 S-001~006 ─────────────────────────

      // S-001~004: 标题含季节词但 season 不匹配
      for (const [season, keywords] of Object.entries(SEASON_TITLE_KEYWORDS)) {
        if (keywords.some(kw => title.includes(kw))) {
          if (recipe.season && recipe.season !== season && recipe.season !== 'all') {
            warnings.push({ rule: `S-${season === 'spring' ? '001' : season === 'summer' ? '002' : season === 'autumn' ? '003' : '004'}`, id, title, detail: `标题含"${keywords.find(k => title.includes(k))}"但 season=${recipe.season}` })
          }
        }
      }

      // S-005: season = all 但标题含明确季节词
      if (recipe.season === 'all') {
        for (const [season, keywords] of Object.entries(SEASON_TITLE_KEYWORDS)) {
          if (keywords.some(kw => title.includes(kw))) {
            suggestions.push({ rule: 'S-005', id, title, detail: `season=all 但标题含季节词"${keywords.find(k => title.includes(k))}"，建议细化` })
            break
          }
        }
      }

      // S-006: 食材含季节性食材但 season 不匹配
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        const ingredientNames = recipe.ingredients.map(i => typeof i === 'object' ? (i.name || '') : String(i)).join(',')
        for (const [season, ingredients] of Object.entries(SEASONAL_INGREDIENTS)) {
          const matchedIngredients = ingredients.filter(ing => ingredientNames.includes(ing))
          if (matchedIngredients.length > 0 && recipe.season && recipe.season !== season && recipe.season !== 'all') {
            warnings.push({ rule: 'S-006', id, title, detail: `食材含${season === 'spring' ? '春季' : season === 'summer' ? '夏季' : season === 'autumn' ? '秋季' : '冬季'}食材"${matchedIngredients.join(',')}"但 season=${recipe.season}` })
          }
        }
      }

      // ── 难度标签 D-001~006 ───────────────────────────────
      const steps = recipe.steps
      const stepsCount = Array.isArray(steps) ? steps.length : 0
      const cookTime = recipe.cookTime || 0
      const stepsText = Array.isArray(steps)
        ? steps.map(s => typeof s === 'object' && s.content ? s.content : typeof s === 'string' ? s : '').join(' ')
        : ''
      const hasSpecialTech = SPECIAL_TECHNIQUES.some(t => stepsText.includes(t))

      // D-001: difficulty = easy 但 steps ≥ 8
      if (recipe.difficulty === 'easy' && stepsCount >= 8) {
        warnings.push({ rule: 'D-001', id, title, detail: `difficulty=easy 但有 ${stepsCount} 步，建议升级为 medium` })
      }

      // D-002: difficulty = easy 但 cookTime ≥ 60
      if (recipe.difficulty === 'easy' && cookTime >= 60) {
        warnings.push({ rule: 'D-002', id, title, detail: `difficulty=easy 但 cookTime=${cookTime}分钟，建议升级为 medium` })
      }

      // D-003: difficulty = hard 但 steps ≤ 3 且 cookTime ≤ 30
      if (recipe.difficulty === 'hard' && stepsCount <= 3 && cookTime <= 30) {
        warnings.push({ rule: 'D-003', id, title, detail: `difficulty=hard 但仅${stepsCount}步且${cookTime}分钟，建议降级为 easy` })
      }

      // D-004: difficulty = medium 但 steps ≤ 3 且 cookTime ≤ 20
      if (recipe.difficulty === 'medium' && stepsCount <= 3 && cookTime <= 20) {
        suggestions.push({ rule: 'D-004', id, title, detail: `difficulty=medium 但仅${stepsCount}步且${cookTime}分钟，建议降级为 easy` })
      }

      // D-005: difficulty = medium 但 steps ≥ 10 且 cookTime ≥ 90
      if (recipe.difficulty === 'medium' && stepsCount >= 10 && cookTime >= 90) {
        suggestions.push({ rule: 'D-005', id, title, detail: `difficulty=medium 但有${stepsCount}步且${cookTime}分钟，建议升级为 hard` })
      }

      // D-006: 步骤含特殊技巧但 difficulty ≠ hard
      if (hasSpecialTech && recipe.difficulty && recipe.difficulty !== 'hard') {
        const matchedTech = SPECIAL_TECHNIQUES.filter(t => stepsText.includes(t))
        warnings.push({ rule: 'D-006', id, title, detail: `步骤含特殊技巧"${matchedTech.join(',')}"但 difficulty=${recipe.difficulty}，建议升级为 hard` })
      }
    }

    // ── 输出报告 ────────────────────────────────────────────
    console.log('===== 数据一致性报告 =====\n')

    console.log(`🔴 错误（${errors.length} 条）`)
    console.log('─'.repeat(60))
    if (errors.length === 0) {
      console.log('  无')
    } else {
      for (const e of errors) {
        console.log(`  [${e.rule}] ${e.title} — ${e.detail}`)
      }
    }
    console.log()

    console.log(`🟡 警告（${warnings.length} 条）`)
    console.log('─'.repeat(60))
    if (warnings.length === 0) {
      console.log('  无')
    } else {
      for (const w of warnings) {
        console.log(`  [${w.rule}] ${w.title} — ${w.detail}`)
      }
    }
    console.log()

    console.log(`🔵 建议（${suggestions.length} 条）`)
    console.log('─'.repeat(60))
    if (suggestions.length === 0) {
      console.log('  无')
    } else {
      for (const s of suggestions) {
        console.log(`  [${s.rule}] ${s.title} — ${s.detail}`)
      }
    }
    console.log()

    console.log('===== 汇总 =====')
    console.log(`  🔴 错误: ${errors.length}`)
    console.log(`  🟡 警告: ${warnings.length}`)
    console.log(`  🔵 建议: ${suggestions.length}`)
    console.log(`  总计: ${errors.length + warnings.length + suggestions.length}`)

    const allPass = errors.length === 0 && warnings.length === 0
    console.log(`\n${allPass ? '✅ 全部通过' : '❌ 存在异常'}`)

  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()
