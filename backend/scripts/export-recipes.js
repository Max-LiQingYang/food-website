#!/usr/bin/env node
'use strict'

/**
 * export-recipes.js
 * 从生产 MariaDB 导出全部食谱数据，生成 seed.js 兼容的 JS 代码片段
 *
 * 用法：
 *   node scripts/export-recipes.js             # 输出到 /tmp/seed-recipes-output.js
 *   node scripts/export-recipes.js --dry-run   # 只打印统计信息
 *
 * 容器内运行需：NODE_PATH=/app/node_modules node scripts/export-recipes.js
 */

const fs = require('fs')
const path = require('path')
const { Sequelize } = require('sequelize')

// ── 命令行参数 ──────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

// ── 数据库连接 ──────────────────────────────────────────────
const sequelize = new Sequelize({
  host: process.env.DB_HOST || '172.17.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  database: process.env.DB_NAME || 'food_website',
  username: process.env.DB_USER || 'food_user',
  password: process.env.DB_PASS || 'food_password',
  dialect: 'mysql',
  dialectModule: require('mysql2'),
  logging: false,
  pool: { max: 5, min: 1, idle: 10000 }
})

// ── 字段列表 ────────────────────────────────────────────────
const ALL_FIELDS = [
  'id', 'title', 'description', 'category', 'season', 'cookTime',
  'servings', 'difficulty', 'coverImage', 'author', 'ingredients',
  'steps', 'nutrition', 'story', 'culturalBackground', 'categoryTags',
  'tips', 'avgRating', 'ratingCount', 'viewCount', 'favoriteCount',
  'createdAt', 'updatedAt'
]

// JSON 字段（在 seed.js 中需要 JSON.stringify()）
const JSON_FIELDS = new Set(['ingredients', 'steps', 'nutrition', 'categoryTags'])

// 需要单引号包裹的文本字段（可能含特殊字符，需转义内部单引号）
const TEXT_FIELDS = new Set(['story', 'culturalBackground', 'tips', 'description'])

// 数值字段
const NUMERIC_FIELDS = new Set([
  'cookTime', 'servings', 'avgRating', 'ratingCount',
  'viewCount', 'favoriteCount'
])

// 布尔字段
const BOOL_FIELDS = new Set(['isFeatured'])

// ── 工具函数 ────────────────────────────────────────────────

/**
 * 转义单引号，用于 JS 单引号字符串
 */
function escapeSingleQuote(str) {
  if (typeof str !== 'string') return str
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

/**
 * 查询全部食谱（原始数据，不经过 Sequelize getter）
 */
async function fetchAllRecipes() {
  const [results] = await sequelize.query(
    `SELECT ${ALL_FIELDS.map(f => `\`${f}\``).join(', ')} FROM recipes ORDER BY createdAt ASC`,
    { raw: true }
  )
  return results
}

/**
 * 查询 video_embeds 表
 */
async function fetchVideoEmbeds() {
  const [results] = await sequelize.query(
    `SELECT DISTINCT recipeId FROM video_embeds`,
    { raw: true }
  )
  return results.map(r => r.recipeId)
}

/**
 * 将单个食谱行转为 JS 对象字面量代码
 */
function recipeToCode(row) {
  const lines = ['  {']

  // id: uuidv4()
  lines.push("    id: uuidv4(),")

  for (const field of ALL_FIELDS) {
    if (field === 'id') continue // 已经处理

    const value = row[field]

    if (value === null || value === undefined) {
      // 跳过 null 的 createdAt/updatedAt
      if (field === 'createdAt' || field === 'updatedAt') continue
      // 其他 null 字段省略（seed.js 不需要显式设置 null）
      continue
    }

    if (JSON_FIELDS.has(field)) {
      // JSON 字段：先解析再 JSON.stringify()
      let parsed
      try {
        parsed = typeof value === 'string' ? JSON.parse(value) : value
      } catch (e) {
        console.error(`  ⚠️  ${row.title}: ${field} JSON 解析失败, 跳过`)
        continue
      }
      const jsonStr = JSON.stringify(parsed)
      lines.push(`    ${field}: JSON.stringify(${jsonStr}),`)
    } else if (TEXT_FIELDS.has(field)) {
      const escaped = escapeSingleQuote(String(value))
      lines.push(`    ${field}: '${escaped}',`)
    } else if (NUMERIC_FIELDS.has(field)) {
      const num = Number(value)
      lines.push(`    ${field}: ${isNaN(num) ? 0 : num},`)
    } else if (BOOL_FIELDS.has(field)) {
      lines.push(`    ${field}: ${value ? 'true' : 'false'},`)
    } else if (field === 'createdAt' || field === 'updatedAt') {
      // 跳过时间戳，seed 时自动生成
      continue
    } else {
      // 其他字符串字段（title, category, season, difficulty, coverImage, author）
      const escaped = escapeSingleQuote(String(value))
      lines.push(`    ${field}: '${escaped}',`)
    }
  }

  lines.push('  }')
  return lines.join('\n')
}

/**
 * 生成完整 JS 代码片段
 */
function generateCode(recipes) {
  const header = `// ── 自动导出自生产 DB (${new Date().toISOString()}) ──\n// 共 ${recipes.length} 道食谱\n`
  const objects = recipes.map(r => recipeToCode(r))
  return header + 'const recipes = [\n' + objects.join(',\n') + '\n]\n'
}

// ── 主函数 ──────────────────────────────────────────────────
async function main() {
  try {
    console.log('🔄 正在连接生产数据库...')
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    console.log('🔄 正在查询食谱数据...')
    const recipes = await fetchAllRecipes()
    console.log(`📊 查询到 ${recipes.length} 道食谱`)

    // 统计信息
    const stats = {
      total: recipes.length,
      withStory: recipes.filter(r => r.story && r.story.trim()).length,
      withCulturalBackground: recipes.filter(r => r.culturalBackground && r.culturalBackground.trim()).length,
      withNutrition: recipes.filter(r => {
        try {
          const n = typeof r.nutrition === 'string' ? JSON.parse(r.nutrition) : r.nutrition
          return n && n.calories !== undefined && n.protein !== undefined
        } catch { return false }
      }).length,
      withCategoryTags: recipes.filter(r => {
        try {
          const t = typeof r.categoryTags === 'string' ? JSON.parse(r.categoryTags) : r.categoryTags
          return t && Object.keys(t).length >= 3
        } catch { return false }
      }).length,
      withRating: recipes.filter(r => r.ratingCount > 0).length,
      categories: [...new Set(recipes.map(r => r.category))],
    }

    console.log('\n📋 数据统计:')
    console.log(`   总食谱数: ${stats.total}`)
    console.log(`   有故事: ${stats.withStory}/${stats.total}`)
    console.log(`   有文化背景: ${stats.withCulturalBackground}/${stats.total}`)
    console.log(`   有营养数据: ${stats.withNutrition}/${stats.total}`)
    console.log(`   有分类标签: ${stats.withCategoryTags}/${stats.total}`)
    console.log(`   有评分: ${stats.withRating}/${stats.total}`)
    console.log(`   分类: ${stats.categories.join(', ')}`)

    // 检查视频覆盖
    try {
      const videoRecipeIds = await fetchVideoEmbeds()
      console.log(`   有视频: ${videoRecipeIds.length}/${stats.total}`)
    } catch (e) {
      console.log(`   视频统计: 查询失败 (${e.message})`)
    }

    if (dryRun) {
      console.log('\n🏁 --dry-run 模式，不输出文件')
      await sequelize.close()
      process.exit(0)
    }

    // 生成代码
    console.log('\n🔄 正在生成 JS 代码...')
    const code = generateCode(recipes)

    // 写入文件
    const outputPath = '/tmp/seed-recipes-output.js'
    fs.writeFileSync(outputPath, code, 'utf-8')
    console.log(`✅ 已写入 ${outputPath} (${(code.length / 1024).toFixed(1)} KB)`)

    await sequelize.close()
    process.exit(0)
  } catch (err) {
    console.error('❌ 导出失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
