'use strict'

/**
 * scripts/populate_tags.js
 * 从 recipes 表中提取标签，填充 tag_suggestions 表
 * 运行方式：docker exec food-backend node /app/scripts/populate_tags.js
 */

const { Sequelize, Op } = require('sequelize')

const CATEGORY_MAP = {
  chinese: '中餐',
  western: '西餐',
  dessert: '甜品',
  japanese: '日料',
  korean: '韩料',
  thai: '泰式',
  vietnamese: '越南',
  indian: '印式',
  greek: '希腊',
  other: '其他',
}

const DIFFICULTY_MAP = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const SEASON_MAP = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
  all: '四季皆宜',
}

// 分类标签中 key 的映射
const categoryLabelMap = {
  ingredient: 'ingredient',
  method: 'cooking',
  cuisine: 'cuisine',
  flavor: 'flavor',
  price: 'ingredient',
}

async function main() {
  const db = new Sequelize('food_website', 'food_user', 'food_password', {
    host: '172.17.0.1',
    dialect: 'mysql',
    logging: false,
  })

  await db.authenticate()
  console.log('DB connected')

  const [recipes] = await db.query('SELECT id, title, category, categoryTags, ingredients, difficulty, season FROM recipes')
  console.log(`Found ${recipes.length} recipes`)

  // 收集所有标签
  const tagMap = new Map() // tag -> { count, categories: Set }

  for (const recipe of recipes) {
    // 1. category 字段
    const catLabel = CATEGORY_MAP[recipe.category]
    if (catLabel) {
      addTag(catLabel, 'cuisine')
    }

    // 2. difficulty
    const diffLabel = DIFFICULTY_MAP[recipe.difficulty]
    if (diffLabel) {
      addTag(diffLabel, 'difficulty')
    }

    // 3. season
    if (recipe.season && recipe.season !== 'all') {
      const seasonLabel = SEASON_MAP[recipe.season]
      if (seasonLabel) {
        addTag(seasonLabel, 'season')
      }
    } else if (recipe.season === 'all') {
      addTag('四季皆宜', 'season')
    }

    // 4. categoryTags (JSON object, possibly with arrays or strings)
    if (recipe.categoryTags) {
      try {
        let ctags = recipe.categoryTags
        if (typeof ctags === 'string') ctags = JSON.parse(ctags)

        for (const [key, value] of Object.entries(ctags)) {
          const mappedCat = categoryLabelMap[key] || 'flavor'
          if (Array.isArray(value)) {
            value.forEach(v => {
              if (typeof v === 'string' && v.trim()) addTag(v.trim(), mappedCat)
            })
          } else if (typeof value === 'string' && value.trim()) {
            addTag(value.trim(), mappedCat)
          }
        }
      } catch (e) {
        // skip malformed JSON
      }
    }

    // 5. ingredients — 提取食材名称
    if (recipe.ingredients) {
      try {
        let ings = recipe.ingredients
        if (typeof ings === 'string') ings = JSON.parse(ings)
        if (Array.isArray(ings)) {
          ings.forEach(item => {
            if (item && item.name && item.name.trim()) {
              addTag(item.name.trim(), 'ingredient')
            }
          })
        }
      } catch (e) {
        // skip
      }
    }
  }

  function addTag(tag, category) {
    const key = `${tag}::${category}`
    const existing = tagMap.get(key)
    if (existing) {
      existing.count++
    } else {
      tagMap.set(key, { tag, category, count: 1 })
    }
  }

  console.log(`Total unique tags: ${tagMap.size}`)

  // 清空旧数据
  await db.query('DELETE FROM tag_suggestions')

  // 批量插入
  const batchSize = 100
  const entries = Array.from(tagMap.values())
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const values = batch.map(e =>
      `(UUID(), '${e.tag.replace(/'/g, "''")}', '${e.category.replace(/'/g, "''")}', ${e.count}, NOW(), NOW(), NOW())`
    )
    const sql = `INSERT INTO tag_suggestions (id, tag, category, count, lastUsedAt, createdAt, updatedAt) VALUES ${values.join(',')}`
    await db.query(sql)
    console.log(`  Inserted ${i + batchSize} / ${entries.length}`)
  }

  console.log('Done!')

  // 验证
  const [countResult] = await db.query('SELECT COUNT(*) as cnt FROM tag_suggestions')
  console.log(`Final tag count: ${countResult[0].cnt}`)

  // 展示 top 20
  const [top] = await db.query('SELECT tag, category, count FROM tag_suggestions ORDER BY count DESC LIMIT 20')
  top.forEach(t => console.log(`  ${t.tag} (${t.category}) = ${t.count}`))

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})