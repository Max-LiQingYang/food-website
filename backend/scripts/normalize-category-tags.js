/**
 * normalize-category-tags.js
 * 将 84 道食谱的 categoryTags 统一为中文字符串格式
 *
 * 用法: node scripts/normalize-category-tags.js
 * 运行前确保 DB 连接信息在环境变量或默认配置中
 */

require('dotenv').config()

const { Sequelize } = require('sequelize')

// ── DB 连接 ──
const sequelize = new Sequelize(
  process.env.DB_NAME || 'food_website',
  process.env.DB_USER || 'food_user',
  process.env.DB_PASSWORD || 'food_password',
  {
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,
  }
)

// ── 英文→中文 映射 ──

const PRICE_MAP = {
  'medium': '中等',
  'low': '经济',
  'high': '高级',
  '中档': '中等',
  '普通家常': '中等',
  '经济实惠': '经济',
}

const METHOD_MAP = {
  'bake': '烤',
  'braise': '炖',
  'raw': '生食',
  'blend': '搅拌',
  'wrap': '卷',
  'simmer': '煮',
  'grill': '煎烤',
}

const CUISINE_MAP = {
  'mexican': '墨西哥',
  'mediterranean': '地中海',
  'indian': '印度',
  'vietnamese': '越南',
  'french': '法式',
  'japanese': '日式',
  'korean': '韩式',
  'thai': '泰式',
  // 中文别名统一
  '法餐': '法式',
  '日料': '日式',
  '韩料': '韩式',
  '西餐': '西式',
  '家常菜': '家常',
  '东南亚菜': '东南亚',
  '西北菜': '西北',
  '苏菜': '苏式',
  '东北菜': '东北',
  '中式': '家常',
}

const INGREDIENT_MAP = {
  'almond-egg': '杏仁/鸡蛋',
  'flour-dairy': '面粉/乳制品',
  'avocado-vegetables': '牛油果/蔬菜',
  'chicken-dairy': '鸡肉/乳制品',
  'chicken-cheese': '鸡肉/芝士',
  'chickpeas-sesame': '鹰嘴豆/芝麻',
  'vegetables-cheese': '蔬菜/芝士',
  'seafood-rice': '海鲜/米饭',
  'beef-rice_noodles': '牛肉/河粉',
  'cheese-egg': '芝士/鸡蛋',
  'beef-corn': '牛肉/玉米',
  'rice-seafood': '米饭/海鲜',
}

const FLAVOR_MAP = {
  'sweet': '甜',
  'mild': '温和',
  'tangy-creamy': '酸甜/奶香',
  'creamy-spicy': '奶香/微辣',
  'spicy-rich': '香辣/浓郁',
  'nutty-tangy': '坚果/酸甜',
  'fresh-tangy': '清新/酸甜',
  'fresh': '清新',
  'savory': '咸鲜',
  'sweet-creamy': '甜/奶香',
  'spicy': '辣',
  'savory-saffron': '咸鲜/藏红花',
}

/**
 * 判断字符串是否有效（非空、非单 ASCII 字符）
 * 中文单字（如 "蒜"、"鱼"）是合法的，保留
 */
function isValidValue(s) {
  if (!s) return false
  // 单个 ASCII 字符过滤（如 "s", "b", "r" 等）
  if (s.length === 1 && s.charCodeAt(0) < 128) return false
  return true
}

/**
 * 对单个字符串值应用映射
 */
function applyMap(s, map) {
  if (!s) return ''
  return map[s] || s
}

/**
 * 将单个标签值统一为字符串
 */
function normalizeValue(value, fieldName) {
  if (!value) return ''

  const map = {
    price: PRICE_MAP,
    method: METHOD_MAP,
    cuisine: CUISINE_MAP,
    ingredient: INGREDIENT_MAP,
    flavor: FLAVOR_MAP,
  }[fieldName] || {}

  // 数组 → 根据字段类型处理
  if (Array.isArray(value)) {
    const cleaned = value
      .map(v => `${v}`.trim())
      .filter(v => isValidValue(v))
    if (cleaned.length === 0) return ''
    if (fieldName === 'ingredient' || fieldName === 'flavor') {
      // 多值用 / 连接
      return cleaned.map(s => applyMap(s, map)).join('/')
    }
    // 其他字段（method/cuisine/price）取首元素
    return applyMap(cleaned[0], map)
  }

  // 字符串
  const str = `${value}`.trim()
  if (!isValidValue(str)) return ''

  return applyMap(str, map)
}

/**
 * 处理单条食谱的 categoryTags
 */
function normalizeCategoryTags(raw) {
  if (!raw) return {}

  let parsed = raw
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw) } catch { return {} }
  }
  if (!parsed || typeof parsed !== 'object') return {}

  const result = {}
  for (const field of ['ingredient', 'method', 'cuisine', 'flavor', 'price']) {
    result[field] = normalizeValue(parsed[field], field)
  }
  return result
}

// ── 主逻辑 ──
async function main() {
  try {
    await sequelize.authenticate()
    console.log('DB 连接成功')

    const [recipes] = await sequelize.query(
      'SELECT id, title, categoryTags FROM recipes ORDER BY id'
    )
    console.log(`读取 ${recipes.length} 条食谱`)

    let changed = 0
    let skipped = 0
    const report = []

    for (const recipe of recipes) {
      const normalized = normalizeCategoryTags(recipe.categoryTags)
      const normalizedStr = JSON.stringify(normalized)

      let oldStr = recipe.categoryTags
      if (typeof oldStr === 'string') {
        try { oldStr = JSON.stringify(JSON.parse(oldStr)) } catch {}
      }

      if (normalizedStr === oldStr) {
        skipped++
        continue
      }

      await sequelize.query(
        'UPDATE recipes SET categoryTags = ? WHERE id = ?',
        { replacements: [normalizedStr, recipe.id] }
      )

      report.push(`  ✓ ${recipe.title}: ${normalizedStr}`)
      changed++
    }

    console.log(`\n${report.join('\n')}`)
    console.log(`\n完成：${changed} 条已更新，${skipped} 条无需修改，共 ${recipes.length} 条`)

    // 验证：检查是否还有英文格式残留
    const [all] = await sequelize.query(
      'SELECT id, title, categoryTags FROM recipes'
    )
    let engCount = 0
    const engCuisine = ['french','indian','japanese','mexican','vietnamese','mediterranean','thai','korean']
    const engMethod = ['bake','braise','raw','blend','wrap','simmer','grill']
    const engPrice = ['medium','low','high']
    const engIngredient = ['almond','flour','avocado','chicken','chickpeas','beef','seafood','rice','cheese']
    const allEng = [...engCuisine, ...engMethod, ...engPrice, ...engIngredient]

    for (const r of all) {
      if (allEng.some(word => r.categoryTags.includes(word))) {
        engCount++
        console.log(`  ⚠️ 含英文: ${r.title} — ${r.categoryTags}`)
      }
    }

    if (engCount === 0) {
      console.log('\n✅ 所有 categoryTags 已统一为中文字符串格式')
    } else {
      console.log(`\n⚠️ ${engCount} 条仍含英文`)
    }

    await sequelize.close()
    process.exit(0)
  } catch (err) {
    console.error('脚本错误:', err)
    await sequelize.close()
    process.exit(1)
  }
}

main()
