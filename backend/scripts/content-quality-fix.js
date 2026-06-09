#!/usr/bin/env node
'use strict'

/**
 * content-quality-fix.js — 内容质量自动修复脚本（写入 DB）
 *
 * 按 PRD 优先级自动修复食谱内容质量问题。
 *
 * 用法：
 *   node scripts/content-quality-fix.js              # 全部修复
 *   node scripts/content-quality-fix.js --dry-run    # 只预览，不写入
 *   node scripts/content-quality-fix.js --batch=10   # 一次处理 10 条
 *   node scripts/content-quality-fix.js --min-score=60  # 只处理低于 60 分的
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { Sequelize } = require('sequelize')

// ── 参数解析 ───────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const BATCH = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1], 10) || Infinity
const MIN_SCORE = parseInt(args.find(a => a.startsWith('--min-score='))?.split('=')[1], 10) || 0

// ── AI API 配置 ────────────────────────────────────────────
const AI_BASE_URL = process.env.AI_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'
const AI_API_KEY = process.env.AI_API_KEY
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v3.2'

// ── Unsplash 美食图片备选 ──────────────────────────────────
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800',
  'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=800',
]

// ── 合法枚举值 ─────────────────────────────────────────────
const VALID_CATEGORIES = ['chinese', 'western', 'japanese', 'korean', 'dessert', 'thai', 'indian', 'vietnamese', 'mexican', 'mediterranean', 'other']
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard']
const VALID_SEASONS = ['spring', 'summer', 'autumn', 'winter', 'all']

// ── 工具函数 ───────────────────────────────────────────────
function parseJSON(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── AI 调用 ────────────────────────────────────────────────
async function callAI(prompt, timeoutMs = 15000) {
  if (!AI_API_KEY) {
    console.warn('⚠️  AI_API_KEY 未配置，跳过 AI 调用')
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      console.warn(`⚠️  AI API 返回 ${res.status}: ${res.statusText}`)
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('⚠️  AI 请求超时')
    } else {
      console.warn(`⚠️  AI 请求失败: ${err.message}`)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── 评分函数（与 check 脚本一致） ──────────────────────────
const SENSORY_WORDS = [
  '香', '酥', '嫩', '鲜', '滑', '脆', '软', '糯', '浓', '醇',
  '弹', '爽', '辣', '麻', '甜', '酸', '咸', '苦', '甘',
  'Q弹', '入口即化', '外酥里嫩', '鲜嫩多汁', '肥而不腻', '麻辣鲜香',
  '酸甜可口', '回味无穷', '唇齿留香', '色香味俱全', '垂涎欲滴',
  '食指大动', '鲜美无比', '浓郁醇厚', '清爽可口',
]

function scoreDescription(recipe) {
  let score = 0
  const desc = recipe.description || ''
  const charCount = desc.replace(/\s/g, '').length

  if (charCount >= 50) score += 5
  else if (charCount >= 20) score += 2

  if (charCount >= 20) score += 5
  else if (charCount > 0) score += 2

  const hasSensory = SENSORY_WORDS.some(w => desc.includes(w))
  if (hasSensory) score += 5

  return score
}

function scoreTips(recipe) {
  const tips = recipe.tips || ''
  if (!tips.trim()) return 0
  return tips.replace(/\s/g, '').length >= 20 ? 10 : 5
}

function scoreNutrition(recipe) {
  const nutrition = parseJSON(recipe.nutrition)
  if (!nutrition || typeof nutrition !== 'object') return 0
  let score = 0
  if (typeof nutrition.calories === 'number' && nutrition.calories > 0) score += 3
  if (nutrition.protein !== undefined && nutrition.protein !== null) score += 2
  if (nutrition.fat !== undefined && nutrition.fat !== null) score += 2
  if (nutrition.carbs !== undefined && nutrition.carbs !== null) score += 2
  if (nutrition.fiber !== undefined && nutrition.fiber !== null) score += 1
  return score
}

// ── 修复函数 ───────────────────────────────────────────────

/** P0: 补全缺失 description */
async function fixMissingDescription(recipe) {
  if (recipe.description && recipe.description.trim().length > 0) return null

  const ingredients = parseJSON(recipe.ingredients)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 8).join('、')
    : ''

  const prompt = `你是一个专业的美食写作专家。请为一道名为"${recipe.title}"的${recipe.category || ''}菜系食谱写一段吸引人的描述（80-150字）。\n\n主要食材：${ingredientNames || '（未知）'}\n\n要求：\n1. 文字生动，包含感官描述词（如香、嫩、鲜、滑、脆等）\n2. 突出食材特点和口味\n3. 让读者看了就想吃\n4. 只返回描述文本，不要加引号或前缀`

  const result = await callAI(prompt)
  if (result && result.length >= 20) {
    return result
  }
  return null
}

/** P0: 替换 placehold.co 占位图 */
function fixPlaceholderImage(recipe) {
  if (!recipe.coverImage || !recipe.coverImage.includes('placehold.co')) return null
  return randomPick(FOOD_IMAGES)
}

/** P1: 扩写短 description */
async function expandShortDescription(recipe) {
  const desc = recipe.description || ''
  const charCount = desc.replace(/\s/g, '').length
  if (charCount >= 50) return null

  const ingredients = parseJSON(recipe.ingredients)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 8).join('、')
    : ''

  const prompt = `你是一个专业的美食写作专家。请将以下食谱描述扩写到80-150字，使其更吸引人。\n\n食谱标题：${recipe.title}\n菜系：${recipe.category || ''}\n主要食材：${ingredientNames || '（未知）'}\n\n当前描述：${desc || '（无）'}\n\n要求：\n1. 文字生动，包含2-3个感官描述词（如香、嫩、鲜、滑、脆、外酥里嫩等）\n2. 突出食材特点和口味\n3. 让读者看了就想吃\n4. 只返回扩写后的描述文本，不要加引号或前缀`

  const result = await callAI(prompt)
  if (result && result.length >= 50) {
    return result
  }
  return null
}

/** P2: 补全缺失 tips */
async function generateTips(recipe) {
  if (recipe.tips && recipe.tips.trim().length >= 20) return null

  const ingredients = parseJSON(recipe.ingredients)
  const steps = parseJSON(recipe.steps)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 8).join('、')
    : ''
  const stepCount = Array.isArray(steps) ? steps.length : 0

  const prompt = `你是一个经验丰富的厨师。请为"${recipe.title}"（${recipe.category || ''}菜系）提供2-3条实用的烹饪小贴士（共30-80字）。\n\n主要食材：${ingredientNames || '（未知）'}\n步骤数：${stepCount}\n\n要求：\n1. 贴士要实用，能帮助烹饪新手避免常见错误\n2. 涉及火候、时间、食材处理等具体建议\n3. 只返回贴士文本，每条一行，不要编号`

  const result = await callAI(prompt)
  if (result && result.length >= 20) {
    return result
  }
  return null
}

/** P3: 补全 nutrition */
async function generateNutrition(recipe) {
  const nutrition = parseJSON(recipe.nutrition)
  if (nutrition && typeof nutrition.calories === 'number' && nutrition.calories > 0 &&
      nutrition.protein !== undefined && nutrition.fat !== undefined && nutrition.carbs !== undefined) {
    return null
  }

  const ingredients = parseJSON(recipe.ingredients)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 10).join('、')
    : ''

  const prompt = `请根据以下食谱信息估算其营养成分。\n\n食谱标题：${recipe.title}\n菜系：${recipe.category || ''}\n主要食材：${ingredientNames || '（未知）'}\n份数：${recipe.servings || 2}\n\n请返回一个 JSON 对象（只返回 JSON，不要其他文字）：\n{\n  "calories": 350,\n  "protein": 25.5,\n  "fat": 12.3,\n  "carbs": 30.8,\n  "fiber": 3.2\n}\n\n数值要合理，calories 是千卡，其他单位是克。`

  const result = await callAI(prompt)
  if (result) {
    try {
      // 尝试从 AI 回复中提取 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (typeof parsed.calories === 'number' && parsed.calories > 0) {
          return parsed
        }
      }
    } catch { /* 解析失败，返回 null */ }
  }
  return null
}

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN 模式 — 只预览，不写入数据库\n')
  }

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
    console.log('✅ 数据库连接成功\n')

    const [rawRecipes] = await sequelize.query(
      'SELECT * FROM recipes ORDER BY title'
    )
    console.log(`📊 共 ${rawRecipes.length} 道食谱\n`)

    // 先跑一次评分，筛选低分食谱
    const candidates = rawRecipes.map(row => ({
      ...row,
      ingredients: parseJSON(row.ingredients),
      steps: parseJSON(row.steps),
      nutrition: parseJSON(row.nutrition),
    })).filter(r => {
      const descScore = scoreDescription(r)
      const tipsScore = scoreTips(r)
      const nutScore = scoreNutrition(r)
      const total = descScore + tipsScore + nutScore
      return total < MIN_SCORE || MIN_SCORE === 0
    })

    const toProcess = candidates.slice(0, BATCH)
    console.log(`🎯 将处理 ${toProcess.length} 道食谱\n`)

    if (toProcess.length === 0) {
      console.log('✅ 没有需要修复的食谱')
      return
    }

    // 分阶段修复，每阶段最多 3 并发
    const CONCURRENCY = 3

    // ── 阶段 1: P0 — 补全缺失 description + 替换占位图 ──
    console.log('=== 阶段 1: P0 — 补全缺失 description + 替换占位图 ===')
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const updates = {}

        // 补全 description
        if (!recipe.description || !recipe.description.trim()) {
          const newDesc = await fixMissingDescription(recipe)
          if (newDesc) {
            updates.description = newDesc
            console.log(`  ✅ [${recipe.title}]: 已生成 description`)
          }
        }

        // 替换占位图
        const newImage = fixPlaceholderImage(recipe)
        if (newImage) {
          updates.coverImage = newImage
          console.log(`  ✅ [${recipe.title}]: 已替换占位图`)
        }

        if (Object.keys(updates).length > 0 && !DRY_RUN) {
          await sequelize.query(
            'UPDATE recipes SET ? WHERE id = ?',
            { replacements: [updates, recipe.id] }
          )
        }
      }))
    }

    // ── 阶段 2: P1 — 扩写短 description ──
    console.log('\n=== 阶段 2: P1 — 扩写短 description ===')
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newDesc = await expandShortDescription(recipe)
        if (newDesc) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET description = ? WHERE id = ?',
              { replacements: [newDesc, recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: 已扩写 description`)
        }
      }))
    }

    // ── 阶段 3: P2 — 补全 tips ──
    console.log('\n=== 阶段 3: P2 — 补全 tips ===')
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newTips = await generateTips(recipe)
        if (newTips) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET tips = ? WHERE id = ?',
              { replacements: [newTips, recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: 已生成 tips`)
        }
      }))
    }

    // ── 阶段 4: P3 — 补全 nutrition ──
    console.log('\n=== 阶段 4: P3 — 补全 nutrition ===')
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
      const batch = toProcess.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newNutrition = await generateNutrition(recipe)
        if (newNutrition) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET nutrition = ? WHERE id = ?',
              { replacements: [JSON.stringify(newNutrition), recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: 已补全 nutrition`)
        }
      }))
    }

    console.log('\n✅ 修复完成')
    if (DRY_RUN) {
      console.log('（DRY RUN 模式，未实际修改数据库）')
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
