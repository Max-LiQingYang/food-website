/**
 * restore-method.js
 * 从 seed.js 恢复被误清除的 method 字段
 * 运行方式：docker exec food-backend node /app/scripts/restore-method.js
 */
const { Sequelize, DataTypes } = require('sequelize')
const path = require('path')
const fs = require('fs')

// ── DB 连接 ──
const sequelize = new Sequelize(
  process.env.DB_NAME || 'food_website',
  process.env.DB_USER || 'food_user',
  process.env.DB_PASSWORD || 'food_password',
  { host: process.env.DB_HOST || '172.17.0.1', dialect: 'mysql', logging: false }
)

// ── 映射 ──
const PRICE_MAP = {
  'medium': '中等', 'low': '经济', 'high': '高级',
  '中档': '中等', '普通家常': '中等', '经济实惠': '经济',
}
const METHOD_MAP = { 'bake': '烤', 'braise': '炖', 'raw': '生食', 'blend': '搅拌', 'wrap': '卷', 'simmer': '煮', 'grill': '煎烤' }
const CUISINE_MAP = {
  'mexican': '墨西哥', 'mediterranean': '地中海', 'indian': '印度', 'vietnamese': '越南',
  'french': '法式', 'japanese': '日式', 'korean': '韩式', 'thai': '泰式',
  '法餐': '法式', '日料': '日式', '韩料': '韩式', '西餐': '西式',
  '家常菜': '家常', '东南亚菜': '东南亚', '西北菜': '西北', '苏菜': '苏式',
  '东北菜': '东北', '中式': '家常',
}
const INGREDIENT_MAP = {
  'almond-egg': '杏仁/鸡蛋', 'flour-dairy': '面粉/乳制品', 'avocado-vegetables': '牛油果/蔬菜',
  'chicken-dairy': '鸡肉/乳制品', 'chicken-cheese': '鸡肉/芝士', 'chickpeas-sesame': '鹰嘴豆/芝麻',
  'vegetables-cheese': '蔬菜/芝士', 'seafood-rice': '海鲜/米饭', 'beef-rice_noodles': '牛肉/河粉',
  'cheese-egg': '芝士/鸡蛋', 'beef-corn': '牛肉/玉米', 'rice-seafood': '米饭/海鲜',
}
const FLAVOR_MAP = {
  'sweet': '甜', 'mild': '温和', 'tangy-creamy': '酸甜/奶香', 'creamy-spicy': '奶香/微辣',
  'spicy-rich': '香辣/浓郁', 'nutty-tangy': '坚果/酸甜', 'fresh-tangy': '清新/酸甜',
  'fresh': '清新', 'savory': '咸鲜', 'sweet-creamy': '甜/奶香', 'spicy': '辣', 'savory-saffron': '咸鲜/藏红花',
}

function isValidValue(s) {
  if (!s) return false
  if (s.length === 1 && s.charCodeAt(0) < 128) return false
  return true
}

function applyMap(s, map) { return map[s] || s }

function normalizeMethod(value) {
  if (!value) return ''
  if (Array.isArray(value)) {
    const cleaned = value.map(v => `${v}`.trim()).filter(v => isValidValue(v))
    if (cleaned.length === 0) return ''
    return applyMap(cleaned[0], METHOD_MAP)
  }
  const str = `${value}`.trim()
  if (!isValidValue(str)) return ''
  return applyMap(str, METHOD_MAP)
}

function normalizeField(value, fieldName, map) {
  if (!value) return ''
  if (Array.isArray(value)) {
    const cleaned = value.map(v => `${v}`.trim()).filter(v => isValidValue(v))
    if (cleaned.length === 0) return ''
    if (fieldName === 'ingredient' || fieldName === 'flavor') {
      return cleaned.map(s => applyMap(s, map)).join('/')
    }
    return applyMap(cleaned[0], map)
  }
  const str = `${value}`.trim()
  if (!isValidValue(str)) return ''
  return applyMap(str, map)
}

/** 用 seed.js 的原始值重新计算 normalized categoryTags */
function computeNormalized(raw) {
  let parsed = raw
  if (typeof raw === 'string') { try { parsed = JSON.parse(raw) } catch { return null } }
  if (!parsed || typeof parsed !== 'object') return null

  return {
    ingredient: normalizeField(parsed.ingredient, 'ingredient', INGREDIENT_MAP),
    method: normalizeMethod(parsed.method),
    cuisine: normalizeField(parsed.cuisine, 'cuisine', CUISINE_MAP),
    flavor: normalizeField(parsed.flavor, 'flavor', FLAVOR_MAP),
    price: normalizeField(parsed.price, 'price', PRICE_MAP),
  }
}

async function main() {
  try {
    await sequelize.authenticate()
    console.log('DB 连接成功')

    // 1. 读取 seed.js（从服务器项目路径）
    const seedPath = path.join(__dirname, '..', 'seeds', 'seed.js')
    let seedContent
    try {
      seedContent = fs.readFileSync(seedPath, 'utf8')
    } catch {
      console.error('无法读取 seed.js:', seedPath)
      process.exit(1)
    }

    // 2. 从 seed.js 提取所有 title→categoryTags 映射
    const titleToSeedCT = new Map()
    const idToSeedCT = new Map()
    const lines = seedContent.split('\n')
    let currentId = null
    let currentTitle = null
    let currentCT = null

    for (const line of lines) {
      const idM = line.match(/id:\s*['"]([^'"]+)['"]/)
      if (idM) currentId = idM[1]
      const titleM = line.match(/title:\s*['"]([^'"]+)['"]/)
      if (titleM) currentTitle = titleM[1]
      const ctM = line.match(/categoryTags:\s*['"]([^'"]+)['"]/)
      if (ctM) {
        currentCT = ctM[1].replace(/\\"/g, '"')
        if (currentTitle && currentCT) {
          titleToSeedCT.set(currentTitle, currentCT)
          if (currentId) idToSeedCT.set(currentId, currentCT)
        }
      }
    }
    console.log(`seed.js 提取 ${titleToSeedCT.size} 条食谱`)

    // 3. 从 DB 读取所有食谱
    const [recipes] = await sequelize.query('SELECT id, title, categoryTags FROM recipes')
    console.log(`DB 读取 ${recipes.length} 条食谱`)

    // 4. 对 method 为空的，从 seed.js 恢复
    let restored = 0
    let noSeedData = 0
    let alreadyOk = 0

    for (const recipe of recipes) {
      let currentCT = recipe.categoryTags
      if (typeof currentCT === 'string') {
        try { currentCT = JSON.parse(currentCT) } catch { continue }
      }
      if (typeof currentCT !== 'object') continue

      // 如果 method 已有值，跳过
      if (currentCT.method && currentCT.method !== '') {
        alreadyOk++
        continue
      }

      // 从 seed.js 获取原始数据
      let seedRaw = idToSeedCT.get(recipe.id) || titleToSeedCT.get(recipe.title)
      if (!seedRaw) {
        noSeedData++
        continue
      }

      // 用原始数据重新计算
      const normalized = computeNormalized(seedRaw)
      if (!normalized || !normalized.method || normalized.method === '') {
        noSeedData++
        continue
      }

      // 合并：保留现有非空字段，只修复 method
      const merged = {
        ingredient: currentCT.ingredient || normalized.ingredient,
        method: normalized.method,
        cuisine: currentCT.cuisine || normalized.cuisine,
        flavor: currentCT.flavor || normalized.flavor,
        price: currentCT.price || normalized.price,
      }

      const mergedStr = JSON.stringify(merged)
      await sequelize.query(
        'UPDATE recipes SET categoryTags = ? WHERE id = ?',
        { replacements: [mergedStr, recipe.id] }
      )

      console.log(`  ✓ ${recipe.title}: method='${normalized.method}' (from seed)`)
      restored++
    }

    console.log(`\n完成：restored=${restored}, already_ok=${alreadyOk}, no_seed_data=${noSeedData}`)

    // 5. 验证
    const [verify] = await sequelize.query("SELECT title, categoryTags FROM recipes WHERE JSON_UNQUOTE(JSON_EXTRACT(categoryTags, '$.method')) = '' OR JSON_UNQUOTE(JSON_EXTRACT(categoryTags, '$.method')) IS NULL")
    console.log(`\n验证：还有 ${verify.length} 条 method 为空`)
    for (const r of verify) {
      console.log(`  ⚠️ ${r.title}`)
    }

    await sequelize.close()
    process.exit(verify.length === 0 ? 0 : 0)
  } catch (err) {
    console.error('脚本错误:', err)
    await sequelize.close()
    process.exit(1)
  }
}
main()
