'use strict'

/**
 * tests/search_enhance.test.js
 * 搜索增强测试 — 多字段匹配 + 相关性排序 + suggestions 端点
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes, Op } = require('sequelize')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  ingredients: { type: DataTypes.TEXT },
  categoryTags: { type: DataTypes.TEXT },
  tips: { type: DataTypes.TEXT },
  story: { type: DataTypes.TEXT },
  culturalBackground: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
}, { tableName: 'recipes', timestamps: true })

const SEED_RECIPES = [
  {
    title: '水煮鱼',
    description: '经典的川菜水煮鱼，麻辣鲜香',
    ingredients: '["鱼片","豆芽","干辣椒","花椒","姜","蒜"]',
    categoryTags: '{"cuisine":"chinese","flavor":"spicy,mala,numbing","ingredient":"fish","method":"boil"}',
    tips: '鱼片用蛋清腌制更嫩滑',
    story: '水煮鱼源自四川自贡',
    culturalBackground: '川菜代表之一',
    category: 'chinese',
    favoriteCount: 10,
  },
  {
    title: '番茄炒蛋',
    description: '家常番茄炒蛋，酸甜可口',
    ingredients: '["番茄","鸡蛋","葱","盐","糖"]',
    categoryTags: '{"cuisine":"chinese","flavor":"sweet,sour","ingredient":"egg,tomato","method":"stir-fry"}',
    tips: '先炒蛋后炒番茄',
    story: '家家都会做的家常菜',
    category: 'chinese',
    favoriteCount: 15,
  },
  {
    title: '麻婆豆腐',
    description: '麻辣鲜香的经典川菜',
    ingredients: '["豆腐","牛肉末","豆瓣酱","花椒","辣椒面"]',
    categoryTags: '{"cuisine":"chinese","flavor":"mala,spicy","ingredient":"tofu,beef","method":"braise"}',
    tips: '用嫩豆腐口感更好',
    story: '陈麻婆创制的经典川菜',
    category: 'chinese',
    favoriteCount: 8,
  },
  {
    title: '日式照烧鸡',
    description: '甜咸适口的照烧鸡腿',
    ingredients: '["鸡腿","酱油","味醂","糖","姜"]',
    categoryTags: '{"cuisine":"japanese","flavor":"sweet,savory","ingredient":"chicken","method":"pan-fry"}',
    tips: '小火慢煎至两面金黄',
    story: '日本家庭料理',
    category: 'japanese',
    favoriteCount: 6,
  },
  {
    title: '泰式冬阴功汤',
    description: '酸辣浓郁的冬阴功汤',
    ingredients: '["虾","蘑菇","香茅","柠檬叶","辣椒","椰奶"]',
    categoryTags: '{"cuisine":"thai","flavor":"sour,spicy","ingredient":"shrimp","method":"boil"}',
    tips: '最后放椰奶防止分离',
    story: '泰国经典酸辣汤',
    category: 'thai',
    favoriteCount: 12,
  },
]

let app

beforeAll(async () => {
  await sequelize.sync({ force: true })
  await Recipe.bulkCreate(SEED_RECIPES)

  app = express()
  app.get('/api/recipes/search', async (req, res) => {
    try {
      let page = parseInt(req.query.page, 10) || 1
      let pageSize = parseInt(req.query.pageSize, 10) || 20
      const { q, sortBy } = req.query
      if (page < 1) page = 1
      if (pageSize > 100) pageSize = 100
      const offset = (page - 1) * pageSize

      if (!q || q.trim().length === 0) {
        return res.status(400).json({ code: 400, message: '搜索关键词不能为空' })
      }

      const query = q.trim()
      const keyword = `%${query}%`

      const where = {
        [Op.or]: [
          { title: { [Op.like]: keyword } },
          { description: { [Op.like]: keyword } },
          { ingredients: { [Op.like]: keyword } },
          { categoryTags: { [Op.like]: keyword } },
          { tips: { [Op.like]: keyword } },
          { story: { [Op.like]: keyword } },
          { culturalBackground: { [Op.like]: keyword } },
        ],
      }

      let order
      if (!sortBy) {
        const literal = require('sequelize').literal
        const rf = literal(`
          CASE
            WHEN title LIKE '%${query}%' THEN 100
            WHEN description LIKE '%${query}%' THEN 40
            WHEN categoryTags LIKE '%${query}%' THEN 30
            WHEN ingredients LIKE '%${query}%' THEN 20
            WHEN tips LIKE '%${query}%' THEN 10
            WHEN story LIKE '%${query}%' THEN 10
            WHEN culturalBackground LIKE '%${query}%' THEN 10
            ELSE 0
          END
        `)
        order = [[rf, 'DESC'], ['favoriteCount', 'DESC'], ['createdAt', 'DESC']]
      } else {
        order = [['createdAt', 'DESC']]
      }

      const { count, rows } = await Recipe.findAndCountAll({ where, order, offset, limit: pageSize, raw: true })
      return res.json({ code: 0, data: { list: rows, total: count, page, pageSize } })
    } catch (err) {
      return res.status(500).json({ code: 500, message: err.message })
    }
  })

  app.get('/api/recipes/suggestions', async (req, res) => {
    try {
      const q = (req.query.q || '').trim()
      if (!q || q.length < 1) {
        return res.json({ code: 0, data: { list: [], total: 0 } })
      }
      const keyword = `%${q}%`
      const rows = await Recipe.findAll({
        where: { [Op.or]: [{ title: { [Op.like]: keyword } }, { description: { [Op.like]: keyword } }] },
        attributes: ['id', 'title', 'category'],
        limit: 6,
        order: [['favoriteCount', 'DESC'], ['createdAt', 'DESC']],
        raw: true,
      })
      return res.json({ code: 0, data: { list: rows, total: rows.length } })
    } catch (err) {
      return res.status(500).json({ code: 500, message: err.message })
    }
  })
})

describe('搜索增强', () => {
  test('1. 基础搜索 — 单字模糊匹配', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '鱼' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  test('2. 搜索 categoryTags 中的字段 — "麻辣"', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '麻辣' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
    expect(titles).toContain('麻婆豆腐')
  })

  test('3. 搜索 tips — "嫩滑"', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '嫩滑' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
  })

  test('4. 搜索 story — "自贡"', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '自贡' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
  })

  test('5. 搜索 culturalBackground — "川菜代表"', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '川菜代表' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
  })

  test('6. 空搜索返回 400', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '' })
    expect(res.status).toBe(400)
  })

  test('7. 相关性排序：标题匹配应排前', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '鸡' })
    expect(res.status).toBe(200)
    const list = res.body.data.list
    if (list.length >= 2) {
      expect(list[0].title).toContain('鸡')
    }
  })

  test('8. suggestions 端点返回轻量级建议', async () => {
    const res = await request(app).get('/api/recipes/suggestions').query({ q: '水' })
    expect(res.status).toBe(200)
    const titles = res.body.data.list.map(r => r.title)
    expect(titles).toContain('水煮鱼')
    if (res.body.data.list.length > 0) {
      expect(res.body.data.list[0].id).toBeDefined()
      expect(res.body.data.list[0].title).toBeDefined()
      expect(res.body.data.list[0].category).toBeDefined()
      expect(res.body.data.list[0].ingredients).toBeUndefined()
    }
  })

  test('9. suggestions 空参数返回空数组', async () => {
    const res = await request(app).get('/api/recipes/suggestions').query({ q: '' })
    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(0)
  })

  test('10. suggestions 不超过6条', async () => {
    const res = await request(app).get('/api/recipes/suggestions').query({ q: '辣' })
    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeLessThanOrEqual(6)
  })
})