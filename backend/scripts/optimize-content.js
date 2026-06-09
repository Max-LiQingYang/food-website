#!/usr/bin/env node
'use strict'

/**
 * optimize-content.js — 热门食谱内容丰富化脚本（写入 DB）
 *
 * 对热门食谱（按 viewCount 排序前 20）进行内容丰富化：
 * 1. 添加/扩写烹饪小贴士
 * 2. 优化步骤描述（补充温度/时间/火候细节）
 * 3. 补全营养信息
 *
 * 用法：
 *   node scripts/optimize-content.js            # 处理前 20 道热门食谱
 *   node scripts/optimize-content.js --dry-run  # 只预览，不写入
 *   node scripts/optimize-content.js --top=10   # 只处理前 10 道
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { Sequelize } = require('sequelize')

// ── 参数解析 ───────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const TOP = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1], 10) || 20

// ── AI API 配置 ────────────────────────────────────────────
const AI_BASE_URL = process.env.AI_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'
const AI_API_KEY = process.env.AI_API_KEY
const AI_MODEL = process.env.AI_MODEL || 'deepseek-v3.2'

// ── 工具函数 ───────────────────────────────────────────────
function parseJSON(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
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
        max_tokens: 800,
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

// ── 优化函数 ───────────────────────────────────────────────

/** 1. 添加/扩写烹饪小贴士（已有 tips 则追加，不覆盖） */
async function optimizeTips(recipe) {
  const existingTips = recipe.tips || ''
  const existingLen = existingTips.replace(/\s/g, '').length

  // 如果已有足够长的 tips，跳过
  if (existingLen >= 40) return null

  const ingredients = parseJSON(recipe.ingredients)
  const steps = parseJSON(recipe.steps)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 8).join('、')
    : ''
  const stepCount = Array.isArray(steps) ? steps.length : 0

  const prompt = `你是一个经验丰富的厨师。请为"${recipe.title}"（${recipe.category || ''}菜系）提供3-5条实用的烹饪小贴士（共50-100字）。\n\n主要食材：${ingredientNames || '（未知）'}\n步骤数：${stepCount}\n\n要求：\n1. 贴士要实用，涉及火候控制、食材处理、时间把控等\n2. 每条贴士用换行分隔\n3. 不要编号\n4. 只返回贴士文本`

  const result = await callAI(prompt)
  if (result && result.length >= 30) {
    // 如果已有 tips，追加新内容
    if (existingTips.trim()) {
      return existingTips.trim() + '\n\n💡 更多小贴士：\n' + result
    }
    return result
  }
  return null
}

/** 2. 优化步骤描述（补充温度/时间/火候细节） */
async function optimizeSteps(recipe) {
  const steps = parseJSON(recipe.steps)
  if (!Array.isArray(steps) || steps.length === 0) return null

  // 检查是否已有足够的量化信息
  const quantifyKeywords = ['分钟', '小时', '秒', '度', '℃', '°C', '克', 'g', '毫升', 'ml',
    '大火', '中火', '小火', '文火', '猛火', '预热']
  const allContent = steps.map(s => (typeof s === 'object' ? s.content || '' : s)).join(' ')
  const hasQuantify = quantifyKeywords.some(kw => allContent.includes(kw))

  // 如果已有量化信息，跳过
  if (hasQuantify) return null

  const ingredients = parseJSON(recipe.ingredients)
  const ingredientNames = Array.isArray(ingredients)
    ? ingredients.map(i => i.name || '').filter(Boolean).slice(0, 8).join('、')
    : ''

  const currentSteps = steps.map((s, i) => {
    const content = typeof s === 'object' ? s.content || '' : s
    return `步骤${i + 1}: ${content}`
  }).join('\n')

  const prompt = `你是一个专业厨师和美食写作专家。请为"${recipe.title}"（${recipe.category || ''}菜系）优化以下烹饪步骤，补充温度、时间、火候等量化信息。\n\n主要食材：${ingredientNames || '（未知）'}\n\n当前步骤：\n${currentSteps}\n\n要求：\n1. 保持原有步骤结构和顺序不变\n2. 为每步补充具体的温度、时间、火候等量化信息\n3. 用 JSON 数组格式返回，每个元素包含 stepNumber 和 content 字段\n4. 只返回 JSON 数组，不要其他文字\n5. 示例格式：[{"stepNumber":1,"content":"鸡胸肉切丁，加料酒腌制15分钟"},{"stepNumber":2,"content":"热锅凉油，油温六成热时下鸡丁滑炒至变色"}]`

  const result = await callAI(prompt)
  if (result) {
    try {
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].content) {
          return JSON.stringify(parsed)
        }
      }
    } catch { /* 解析失败 */ }
  }
  return null
}

/** 3. 补全营养信息 */
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
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (typeof parsed.calories === 'number' && parsed.calories > 0) {
          return JSON.stringify(parsed)
        }
      }
    } catch { /* 解析失败 */ }
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

    // 按 viewCount 排序取热门食谱
    const [rawRecipes] = await sequelize.query(
      'SELECT * FROM recipes ORDER BY COALESCE(viewCount, 0) DESC LIMIT ?',
      { replacements: [TOP] }
    )
    console.log(`📊 热门食谱（前 ${rawRecipes.length} 道）:\n`)
    rawRecipes.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.title}] — 浏览: ${r.viewCount || 0}`)
    })
    console.log()

    const recipes = rawRecipes.map(row => ({
      ...row,
      ingredients: parseJSON(row.ingredients),
      steps: parseJSON(row.steps),
      nutrition: parseJSON(row.nutrition),
    }))

    const CONCURRENCY = 3

    // ── 优化 1: 添加/扩写 tips ──
    console.log('=== 优化 1: 添加/扩写烹饪小贴士 ===')
    for (let i = 0; i < recipes.length; i += CONCURRENCY) {
      const batch = recipes.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newTips = await optimizeTips(recipe)
        if (newTips) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET tips = ? WHERE id = ?',
              { replacements: [newTips, recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: tips 已优化`)
        } else {
          console.log(`  ➖ [${recipe.title}]: tips 已足够，跳过`)
        }
      }))
    }

    // ── 优化 2: 优化步骤描述 ──
    console.log('\n=== 优化 2: 优化步骤描述（补充量化信息） ===')
    for (let i = 0; i < recipes.length; i += CONCURRENCY) {
      const batch = recipes.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newSteps = await optimizeSteps(recipe)
        if (newSteps) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET steps = ? WHERE id = ?',
              { replacements: [newSteps, recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: 步骤已优化`)
        } else {
          console.log(`  ➖ [${recipe.title}]: 步骤已含量化信息，跳过`)
        }
      }))
    }

    // ── 优化 3: 补全营养信息 ──
    console.log('\n=== 优化 3: 补全营养信息 ===')
    for (let i = 0; i < recipes.length; i += CONCURRENCY) {
      const batch = recipes.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(batch.map(async (recipe) => {
        const newNutrition = await generateNutrition(recipe)
        if (newNutrition) {
          if (!DRY_RUN) {
            await sequelize.query(
              'UPDATE recipes SET nutrition = ? WHERE id = ?',
              { replacements: [newNutrition, recipe.id] }
            )
          }
          console.log(`  ✅ [${recipe.title}]: nutrition 已补全`)
        } else {
          console.log(`  ➖ [${recipe.title}]: nutrition 已完整，跳过`)
        }
      }))
    }

    console.log('\n✅ 内容丰富化完成')
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
