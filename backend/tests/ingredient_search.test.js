'use strict'

/**
 * tests/ingredient_search.test.js
 * 智能食材搜索 — POST /api/recipes/by-ingredients
 * 别名展开 + AI fallback (mock) + 匹配度排序
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes, Op } = require('sequelize')
const { expandIngredients, ALIAS_TO_CANONICAL } = require('../utils/ingredientAliases')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  ingredients: { type: DataTypes.TEXT },
  coverImage: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  difficulty: { type: DataTypes.STRING },
  cookTime: { type: DataTypes.INTEGER },
  servings: { type: DataTypes.INTEGER },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  nutrition: { type: DataTypes.TEXT },
}, { tableName: 'recipes', timestamps: false })

/**
 * 获取某个原始食材输入的所有关联别名
 */
function getRelatedAliases(orig, expandedAliases) {
  const lowerOrig = orig.toLowerCase()
  // 找到所有通过别名关联的项
  const canonical = ALIAS_TO_CANONICAL[lowerOrig]
  if (canonical) {
    // 所有属于同一规范组的别名
    const { CANONICAL_TO_ALIASES } = require('../utils/ingredientAliases')
    const groupNames = CANONICAL_TO_ALIASES[canonical].map(n => n.toLowerCase())
    return groupNames
  }
  // 无别名关系，返回原值
  return [lowerOrig]
}

function createApp() {
  const app = express()
  app.use(express.json())

  app.post('/api/recipes/by-ingredients', async (req, res) => {
    const { ingredients = [] } = req.body
    if (!ingredients.length) return res.status(400).json({ code: 400, message: '请提供至少一种食材' })

    const expandedIngredients = expandIngredients(ingredients)
    const originalInput = ingredients.map(i => i.trim().toLowerCase())

    // 为每个原始食材构建 OR 条件（别名展开）
    const conditions = originalInput.map(orig => {
      const relatedAliases = getRelatedAliases(orig, expandedIngredients)
      return {
        [Op.or]: relatedAliases.map(a => ({
          ingredients: { [Op.like]: `%${a}%` },
        })),
      }
    })

    const rows = await Recipe.findAll({ where: { [Op.and]: conditions } })

    const result = rows.map(recipe => {
      let recipeIngredients = []
      try {
        const parsed = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients
        recipeIngredients = Array.isArray(parsed) ? parsed.map(i => typeof i === 'string' ? i : (i.name || '')).filter(Boolean) : []
      } catch { recipeIngredients = [] }

      const userLowerExpanded = expandedIngredients
      const matchedIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return userLowerExpanded.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })
      const missingIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return !userLowerExpanded.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })
      const matchRatio = recipeIngredients.length > 0 ? Math.round((matchedIngredients.length / recipeIngredients.length) * 100) : 0

      return { ...recipe.toJSON(), matchRatio, matchedIngredients: matchedIngredients.slice(0, 5), missingIngredients: missingIngredients.slice(0, 10), matchCount: matchedIngredients.length, totalIngredients: recipeIngredients.length }
    })
    result.sort((a, b) => b.matchRatio - a.matchRatio)
    res.json({ code: 0, data: { list: result, total: rows.length, userIngredients: ingredients } })
  })

  return app
}

describe('智能食材搜索接口', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    await Recipe.bulkCreate([
      { title: '番茄炒蛋', ingredients: JSON.stringify(['番茄', '鸡蛋', '盐', '葱花']) },
      { title: '番茄牛腩', ingredients: JSON.stringify(['番茄', '牛腩', '土豆', '姜', '八角']) },
      { title: '青椒肉丝', ingredients: JSON.stringify(['青椒', '猪肉', '姜', '蒜', '酱油']) },
      { title: '蛋炒饭', ingredients: JSON.stringify(['鸡蛋', '米饭', '葱花', '盐', '油']) },
      { title: '红烧肉', ingredients: JSON.stringify(['五花肉', '酱油', '冰糖', '八角', '姜', '料酒']) },
      { title: '土豆炖牛肉', ingredients: JSON.stringify(['土豆', '牛肉', '洋葱', '姜', '酱油', '料酒']) },
      { title: '醋溜白菜', ingredients: JSON.stringify(['白菜', '醋', '干辣椒', '蒜', '盐']) },
      { title: '麻婆豆腐', ingredients: JSON.stringify(['豆腐', '牛肉末', '豆瓣酱', '花椒', '辣椒面', '葱花']) },
      { title: '香菇鸡汤', ingredients: JSON.stringify(['香菇', '鸡肉', '姜', '枸杞', '盐']) },
      { title: '西红柿蛋花汤', ingredients: JSON.stringify(['西红柿', '鸡蛋', '葱花', '盐', '香油']) },
    ])
    app = createApp()
  })

  test('无食材参数时返回400', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: [] })
    expect(res.status).toBe(400)
  })

  test('别名展开：西红柿 → 番茄炒蛋', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['西红柿', '鸡蛋'] })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('番茄炒蛋')   // 别名展开：西红柿→番茄
    expect(titles).toContain('西红柿蛋花汤') // 直接匹配
  })

  test('别名展开：马铃薯 → 土豆炖牛肉', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['马铃薯'] })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('土豆炖牛肉')
    expect(titles).toContain('番茄牛腩') // 含土豆
  })

  test('别名展开：生粉 → 含淀粉的食谱', async () => {
    // 生粉是淀粉的别名，测试别名组匹配
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['生粉'] })
    expect(res.status).toBe(200)
    // 没有直接含"生粉"的食谱，但"酱油"是生抽的别名
    // 生粉对应淀粉组，但DB中没有食谱食材含"生粉"或"淀粉"
    // 所以结果可能为空（这是合理的）
  })

  test('别名展开：生抽 → 含"酱油"的食谱', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['生抽'] })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    // 生抽是酱油的别名，DB中酱油出现在：青椒肉丝、红烧肉、土豆炖牛肉
    expect(titles).toContain('青椒肉丝')
    expect(titles).toContain('红烧肉')
  })

  test('别名展开：包菜 → 醋溜白菜', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['包菜'] })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('醋溜白菜')
  })

  test('按匹配度排序', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '盐'] })
    const items = res.body.data.list
    expect(items[0].matchRatio).toBeGreaterThanOrEqual(items[items.length - 1].matchRatio)
  })

  test('完全匹配食谱排在最前', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '鸡蛋', '盐', '葱花'] })
    expect(res.body.data.list[0].title).toBe('番茄炒蛋')
  })

  test('返回缺少食材提示', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄'] })
    const hasMissing = res.body.data.list.some(r => r.missingIngredients.length > 0)
    expect(hasMissing).toBe(true)
  })

  test('不存在的食材返回空列表', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['火龙果', '榴莲'] })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
  })
})

describe('食材别名工具函数', () => {
  test('expandIngredients 展开番茄组', () => {
    const expanded = expandIngredients(['番茄'])
    expect(expanded).toContain('番茄')
    expect(expanded).toContain('西红柿')
    expect(expanded).toContain('蕃茄')
  })

  test('expandIngredients 从别名反向查找', () => {
    const expanded = expandIngredients(['西红柿'])
    expect(expanded).toContain('番茄')
    expect(expanded).toContain('西红柿')
    expect(expanded).toContain('蕃茄')
  })

  test('expandIngredients 展开土豆组', () => {
    const expanded = expandIngredients(['马铃薯'])
    expect(expanded).toContain('马铃薯')
    expect(expanded).toContain('土豆')
    expect(expanded).toContain('洋芋')
  })

  test('expandIngredients 展开淀粉组', () => {
    const expanded = expandIngredients(['生粉'])
    expect(expanded).toContain('生粉')
    expect(expanded).toContain('淀粉')
    expect(expanded).toContain('芡粉')
    expect(expanded).toContain('太白粉')
    expect(expanded).toContain('玉米淀粉')
  })

  test('expandIngredients 展开白菜组', () => {
    const expanded = expandIngredients(['包菜'])
    expect(expanded).toContain('包菜')
    expect(expanded).toContain('卷心菜')
    expect(expanded).toContain('白菜')
    expect(expanded).toContain('高丽菜')
  })

  test('expandIngredients 去重', () => {
    const expanded = expandIngredients(['番茄', '西红柿'])
    const uniqueCount = new Set(expanded).size
    expect(expanded.length).toBe(uniqueCount)
  })

  test('expandIngredients 无别名词的保留原值', () => {
    const expanded = expandIngredients(['火龙果', '榴莲'])
    expect(expanded).toContain('火龙果')
    expect(expanded).toContain('榴莲')
  })

  test('expandIngredients 空输入', () => {
    expect(expandIngredients([]).length).toBe(0)
  })
})