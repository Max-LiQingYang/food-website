'use strict'

/**
 * tests/ingredient_search.test.js
 * 智能食材搜索 — POST /api/recipes/by-ingredients
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

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

function createApp() {
  const app = express()
  app.use(express.json())

  app.post('/api/recipes/by-ingredients', async (req, res) => {
    const { ingredients = [] } = req.body
    if (!ingredients.length) return res.status(400).json({ code: 400, message: '请提供至少一种食材' })

    const { Op } = require('sequelize')
    const where = {
      [Op.and]: ingredients.map(ing => ({ ingredients: { [Op.like]: `%${ing.trim()}%` } })),
    }
    const rows = await Recipe.findAll({ where })

    const result = rows.map(recipe => {
      let recipeIngredients = []
      try {
        const parsed = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients
        recipeIngredients = Array.isArray(parsed) ? parsed.map(i => typeof i === 'string' ? i : (i.name || '')).filter(Boolean) : []
      } catch { recipeIngredients = [] }

      const userIngLower = ingredients.map(i => i.trim().toLowerCase())
      const matchedIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return userIngLower.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })
      const missingIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return !userIngLower.some(ui => riLower.includes(ui) || ui.includes(riLower))
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
    ])
    app = createApp()
  })

  test('无食材参数时返回400', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: [] })
    expect(res.status).toBe(400)
  })

  test('搜索匹配食材', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '鸡蛋'] })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
    // AND 条件：同时包含番茄和鸡蛋的只有「番茄炒蛋」
    expect(res.body.data.list[0].title).toContain('番茄')
  })

  test('按匹配度排序', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '盐'] })
    const items = res.body.data.list
    // 番茄炒蛋（番茄+盐 2/4=50%）> 番茄牛腩（番茄 1/5=20%）
    expect(items[0].matchRatio).toBeGreaterThanOrEqual(items[items.length - 1].matchRatio)
  })

  test('完全匹配食谱排在前面', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '鸡蛋', '盐', '葱花'] })
    expect(res.body.data.list[0].title).toBe('番茄炒蛋')
  })

  test('返回缺少食材提示', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄'] })
    expect(res.body.data.list[0].missingIngredients.length).toBeGreaterThanOrEqual(1)
  })

  test('返回用户输入的食材列表', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['番茄', '鸡蛋'] })
    expect(res.body.data.userIngredients).toEqual(['番茄', '鸡蛋'])
  })

  test('不存在的食材返回空列表', async () => {
    const res = await request(app).post('/api/recipes/by-ingredients').send({ ingredients: ['火龙果', '榴莲'] })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
  })
})