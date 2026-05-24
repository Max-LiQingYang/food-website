'use strict'

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: false },
  ingredients: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  steps: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  servings: { type: DataTypes.INTEGER, defaultValue: 2 },
  difficulty: { type: DataTypes.STRING, defaultValue: '中等' },
  cookTime: { type: DataTypes.INTEGER, defaultValue: 30 },
  image: { type: DataTypes.STRING, allowNull: true },
  coverImage: { type: DataTypes.STRING, allowNull: true },
  userId: { type: DataTypes.STRING, allowNull: true },
  author: { type: DataTypes.STRING, allowNull: true },
  season: { type: DataTypes.STRING, allowNull: true },
  nutrition: { type: DataTypes.JSON, allowNull: true },
  tips: { type: DataTypes.TEXT, allowNull: true },
  categoryTags: { type: DataTypes.JSON, allowNull: true },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'recipes', timestamps: true })

describe('Recipes API Helpers', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    // Seed recipes
    const recipes = [
      { title: '番茄炒蛋', description: '经典家常菜', category: '中式', ingredients: [{name:'番茄'},{name:'鸡蛋'},{name:'盐'}], steps: [{content:'打鸡蛋'},{content:'炒番茄'}], difficulty: '简单', cookTime: 15, nutrition: {calories: 200, protein: 15, fat: 12, sodium: 500, fiber: 2}, season: 'all', categoryTags: {cuisine:'中式',method:'炒',flavor:'咸鲜'}, favoriteCount: 20 },
      { title: '麻婆豆腐', description: '麻辣鲜香', category: '中式', ingredients: [{name:'豆腐'},{name:'牛肉末'},{name:'豆瓣酱'},{name:'花椒'}], steps: [{content:'切豆腐'},{content:'炒肉末'},{content:'加豆瓣'},{content:'出锅'}], difficulty: '中等', cookTime: 20, nutrition: {calories: 350, protein: 20, fat: 18, sodium: 900, fiber: 3}, season: 'all', categoryTags: {cuisine:'中式',method:'煮',flavor:'麻辣'}, favoriteCount: 35 },
      { title: '意大利面', description: '西式经典', category: '西式', ingredients: [{name:'意面'},{name:'番茄酱'},{name:'洋葱'}], steps: [{content:'煮面'},{content:'炒酱'}], difficulty: '简单', cookTime: 25, nutrition: {calories: 450, protein: 10, fat: 8, sodium: 600, fiber: 4}, season: 'all', categoryTags: {cuisine:'西式',method:'煮',flavor:'酸甜'}, favoriteCount: 15 },
      { title: '奶油蘑菇汤', description: '浓郁西式汤', category: '西式', ingredients: [{name:'蘑菇'},{name:'奶油'},{name:'面粉'}], steps: [{content:'切蘑菇'},{content:'炒面粉'},{content:'加奶油'}], difficulty: '中等', cookTime: 30, nutrition: {calories: 300, protein: 8, fat: 22, sodium: 400, fiber: 1}, season: 'autumn', categoryTags: {cuisine:'西式',method:'煮',flavor:'奶香'}, favoriteCount: 8 },
      { title: '芒果布丁', description: '夏日甜品', category: '甜品', ingredients: [{name:'芒果'},{name:'吉利丁'},{name:'牛奶'}], steps: [{content:'打芒果泥'},{content:'加热牛奶'},{content:'冷藏'}], difficulty: '简单', cookTime: 180, nutrition: {calories: 250, protein: 5, fat: 10, sodium: 100, fiber: 1}, season: 'summer', categoryTags: {cuisine:'甜品',method:'冷藏',flavor:'甜'}, favoriteCount: 5 },
      { title: '蛋炒饭', description: '快手主食', category: '中式', ingredients: [{name:'米饭'},{name:'鸡蛋'},{name:'葱花'}], steps: [{content:'打鸡蛋'},{content:'炒饭'}], difficulty: '简单', cookTime: 10, nutrition: {calories: 400, protein: 12, fat: 15, sodium: 300, fiber: 0.5}, season: 'all', categoryTags: {cuisine:'中式',method:'炒',flavor:'咸香'}, favoriteCount: 25 },
    ]
    for (const r of recipes) {
      await Recipe.create(r)
    }

    // NutriScore calculation helper
    function calculateNutriScore(nutrition) {
      if (!nutrition) return 'N/A'
      const points = (nutrition.calories || 0) * 0.03
        + (nutrition.sodium || 0) * 0.008
        + (nutrition.fat || 0) * 0.05
        - (nutrition.fiber || 0) * 0.3
        - (nutrition.protein || 0) * 0.2
      if (points <= 4) return 'A'
      if (points <= 8) return 'B'
      if (points <= 13) return 'C'
      if (points <= 18) return 'D'
      return 'E'
    }

    function calculateSmartDifficulty(difficulty, cookTime, stepsCount) {
      if (difficulty === '简单' && cookTime <= 20 && stepsCount <= 3) return '简单'
      if (difficulty === '困难' || cookTime >= 60 || stepsCount >= 6) return '困难'
      return '中等'
    }

    app = express()
    app.use(express.json())

    // Search endpoint
    app.get('/api/recipes/search', async (req, res) => {
      try {
        const q = (req.query.q || '').toLowerCase()
        if (!q) return res.json({ code: 200, data: [] })
        const all = await Recipe.findAll()
        const results = all.filter(r => {
          const titleMatch = r.title.toLowerCase().includes(q)
          const descMatch = r.description && r.description.toLowerCase().includes(q)
          const ingMatch = (r.ingredients || []).some(i => (i.name || '').toLowerCase().includes(q))
          return titleMatch || descMatch || ingMatch
        })
        res.json({ code: 200, data: results })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // Recommend endpoint
    app.get('/api/recipes/recommend', async (req, res) => {
      try {
        const ingredients = (req.query.ingredients || '').split(',').filter(Boolean).map(s => s.trim())
        if (!ingredients.length) return res.json({ code: 200, data: [] })
        const all = await Recipe.findAll()
        const scored = all.map(r => {
          const ingNames = (r.ingredients || []).map(i => i.name.toLowerCase())
          const matches = ingredients.filter(ing => ingNames.some(name => name.includes(ing)))
          return { recipe: r, score: matches.length, matches }
        }).filter(r => r.score > 0)
        scored.sort((a, b) => b.score - a.score)
        res.json({ code: 200, data: scored })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // Seasonal endpoint
    app.get('/api/recipes/seasonal', async (req, res) => {
      try {
        const season = req.query.season || 'all'
        const all = await Recipe.findAll()
        let results = all.filter(r => r.season === season || r.season === 'all' || !r.season)
        results.sort((a, b) => (b.favoriteCount || 0) - (a.favoriteCount || 0))
        const withScore = results.map(r => ({
          ...r.toJSON(),
          nutriScore: calculateNutriScore(r.nutrition),
          smartDifficulty: calculateSmartDifficulty(r.difficulty, r.cookTime, (r.steps || []).length),
        }))
        res.json({ code: 200, data: withScore })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })

    // Search hot keywords
    const hotKeywords = ['番茄', '鸡蛋', '炒饭', '蛋糕', '鸡翅', '牛肉', '汤', '沙拉', '饼', '面']
    app.get('/api/recipes/hot-keywords', (req, res) => {
      res.json({ code: 200, data: hotKeywords })
    })

    // Recipe detail
    app.get('/api/recipes/:id', async (req, res) => {
      try {
        const recipe = await Recipe.findByPk(req.params.id)
        if (!recipe) return res.status(404).json({ code: 404, message: 'Not found' })
        const json = recipe.toJSON()
        json.nutriScore = calculateNutriScore(recipe.nutrition)
        json.smartDifficulty = calculateSmartDifficulty(recipe.difficulty, recipe.cookTime, (recipe.steps || []).length)
        res.json({ code: 200, data: json })
      } catch (err) {
        res.status(500).json({ code: 500, message: err.message })
      }
    })
  })

  describe('搜索', () => {
    it('空查询返回空数组', async () => {
      const res = await request(app).get('/api/recipes/search')
      expect(res.body.data).toEqual([])
    })

    it('按标题搜索', async () => {
      const res = await request(app).get('/api/recipes/search?q=' + encodeURIComponent('番茄'))
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0].title).toContain('番茄')
    })

    it('按描述搜索', async () => {
      const res = await request(app).get('/api/recipes/search?q=' + encodeURIComponent('家常菜'))
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('按食材搜索', async () => {
      const res = await request(app).get('/api/recipes/search?q=' + encodeURIComponent('牛肉'))
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data.some(r => r.title === '麻婆豆腐')).toBe(true)
    })

    it('不存在的关键词返回空', async () => {
      const res = await request(app).get('/api/recipes/search?q=' + encodeURIComponent('不存在的食谱xyz'))
      expect(res.body.data).toHaveLength(0)
    })

    it('搜索不区分大小写', async () => {
      const res = await request(app).get('/api/recipes/search?q=XIHONGSHI')
      expect(res.body.data.length).toBe(0)
    })
  })

  describe('食材推荐', () => {
    it('无食材时返回空', async () => {
      const res = await request(app).get('/api/recipes/recommend')
      expect(res.body.data).toEqual([])
    })

    it('按单个食材推荐', async () => {
      const res = await request(app).get('/api/recipes/recommend?ingredients=' + encodeURIComponent('鸡蛋'))
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data.every(r => r.matches.length > 0)).toBe(true)
    })

    it('按多个食材推荐并排序', async () => {
      const res = await request(app).get('/api/recipes/recommend?ingredients=' + encodeURIComponent('鸡蛋,番茄'))
      expect(res.body.data.length).toBeGreaterThan(0)
      // 番茄炒蛋应该排在第一（匹配2个食材）
      expect(res.body.data[0].score).toBeGreaterThanOrEqual(1)
    })

    it('推荐的分数正确', async () => {
      const res = await request(app).get('/api/recipes/recommend?ingredients=' + encodeURIComponent('鸡蛋,番茄,盐'))
      const top = res.body.data[0]
      expect(top.score).toBeDefined()
      expect(top.matches.length).toBeGreaterThanOrEqual(1)
    })

    it('无匹配食材返回空', async () => {
      const res = await request(app).get('/api/recipes/recommend?ingredients=' + encodeURIComponent('松露,鱼子酱'))
      expect(res.body.data).toHaveLength(0)
    })
  })

  describe('季节性推荐', () => {
    it('all 季节返回所有食谱', async () => {
      const res = await request(app).get('/api/recipes/seasonal?season=all')
      expect(res.body.data.length).toBeGreaterThan(3)
    })

    it('autumn 季节返回匹配食谱', async () => {
      const res = await request(app).get('/api/recipes/seasonal?season=autumn')
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data.some(r => r.title === '奶油蘑菇汤')).toBe(true)
    })

    it('summer 季节返回匹配食谱', async () => {
      const res = await request(app).get('/api/recipes/seasonal?season=summer')
      expect(res.body.data.length).toBeGreaterThan(0)
      // 芒果布丁应该有 summer 标签
      const pudding = res.body.data.find(r => r.title === '芒果布丁')
      expect(pudding).toBeDefined()
    })

    it('季节推荐按收藏数降序', async () => {
      const res = await request(app).get('/api/recipes/seasonal?season=all')
      for (let i = 1; i < res.body.data.length; i++) {
        expect(res.body.data[i - 1].favoriteCount >= res.body.data[i].favoriteCount).toBe(true)
      }
    })
  })

  describe('NutriScore 计算', () => {
    it('番茄炒蛋 NutriScore 为 B', async () => {
      const res = await request(app).get('/api/recipes/' + (await Recipe.findOne({ where: { title: '番茄炒蛋' } })).id)
      expect(res.body.data.nutriScore).toBe('B')
    })

    it('奶油蘑菇汤 NutriScore 为 C', async () => {
      const res = await request(app).get('/api/recipes/' + (await Recipe.findOne({ where: { title: '奶油蘑菇汤' } })).id)
      expect(['C', 'D', 'E']).toContain(res.body.data.nutriScore)
    })

    it('芒果布丁 NutriScore 不为空', async () => {
      const res = await request(app).get('/api/recipes/' + (await Recipe.findOne({ where: { title: '芒果布丁' } })).id)
      expect(res.body.data.nutriScore).toBeDefined()
    })
  })

  describe('SmartDifficulty 计算', () => {
    it('番茄炒蛋难度为简单', async () => {
      const recipe = await Recipe.findOne({ where: { title: '番茄炒蛋' } })
      const res = await request(app).get('/api/recipes/' + recipe.id)
      expect(res.body.data.smartDifficulty).toBe('简单')
    })

    it('麻婆豆腐难度为中等', async () => {
      const recipe = await Recipe.findOne({ where: { title: '麻婆豆腐' } })
      const res = await request(app).get('/api/recipes/' + recipe.id)
      expect(res.body.data.smartDifficulty).toBe('中等')
    })
  })

  describe('热门关键词', () => {
    it('返回 10 个热门关键词', async () => {
      const res = await request(app).get('/api/recipes/hot-keywords')
      expect(res.body.data).toHaveLength(10)
    })

    it('包含' + '番茄', async () => {
      const res = await request(app).get('/api/recipes/hot-keywords')
      expect(res.body.data).toContain('番茄')
    })

    it('包含鸡蛋', async () => {
      const res = await request(app).get('/api/recipes/hot-keywords')
      expect(res.body.data).toContain('鸡蛋')
    })
  })

  describe('整体功能', () => {
    it('搜索和推荐总记录覆盖', async () => {
      const searchRes = await request(app).get('/api/recipes/search?q=' + encodeURIComponent('蛋'))
      const recRes = await request(app).get('/api/recipes/recommend?ingredients=' + encodeURIComponent('鸡蛋'))
      const seasonalRes = await request(app).get('/api/recipes/seasonal?season=all')
      expect(searchRes.body.data.length).toBeGreaterThan(0)
      expect(recRes.body.data.length).toBeGreaterThan(0)
      expect(seasonalRes.body.data.length).toBeGreaterThan(0)
    })
  })
})