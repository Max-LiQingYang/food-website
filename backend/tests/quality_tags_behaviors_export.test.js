'use strict'

/**
 * tests/quality_tags_behaviors_export.test.js
 * 迭代#35 内容质量增强 — 质量评分 / 标签系统 / 行为追踪 / 导出
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

// ── 内联 SQLite 内存模型 ──────────────────────────────────────────────────

const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })

// Recipe 简化模型
const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  category: DataTypes.STRING,
  difficulty: DataTypes.STRING,
  servings: DataTypes.STRING,
  cookTime: DataTypes.STRING,
  preparationTime: DataTypes.STRING,
  ingredients: DataTypes.TEXT,
  steps: DataTypes.TEXT,
  tips: DataTypes.TEXT,
  nutrition: DataTypes.TEXT,
  categoryTags: DataTypes.TEXT,
  qualityScore: DataTypes.FLOAT,
  coverImage: DataTypes.TEXT,
  favorites: DataTypes.INTEGER,
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE,
}, { tableName: 'recipes', timestamps: true })

// TagSuggestion
const TagSuggestion = sequelize.define('TagSuggestion', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tag: DataTypes.STRING,
  category: DataTypes.STRING,
  count: { type: DataTypes.INTEGER, defaultValue: 1 },
  relatedTags: DataTypes.TEXT,
  lastUsedAt: DataTypes.DATE,
}, { tableName: 'tag_suggestions', timestamps: true })

// BehaviorEvent
const BehaviorEvent = sequelize.define('BehaviorEvent', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: DataTypes.STRING,
  eventType: DataTypes.STRING,
  recipeId: DataTypes.STRING,
  metadata: DataTypes.TEXT,
  timestamp: DataTypes.DATE,
}, { tableName: 'behavior_events', timestamps: false })

// ── 内联路由 ──────────────────────────────────────────────────────────────

const auth = (req, res, next) => {
  req.user = { id: 'test-user-1', username: 'tester', role: 'user' }
  next()
}

const { Op } = require('sequelize')

// 质量评分函数（从 quality.js 复制）
function computeIngredientCompleteness(recipe) {
  if (!recipe.ingredients) return { score: 0, maxScore: 10, detail: '无食材列表' }
  let ingredients = recipe.ingredients
  if (typeof ingredients === 'string') {
    try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return { score: 0, maxScore: 10, detail: '食材列表为空' }
  }
  let score = 0
  const count = ingredients.length
  score += Math.min(count, 10) * 0.5
  const richIngredients = ingredients.filter(i => {
    const name = typeof i === 'string' ? i : (i.name || i.ingredient || '')
    return name.length > 2
  })
  score += Math.min(richIngredients.length / Math.max(count, 1) * 3, 3)
  if (count >= 2) score += 1
  if (count >= 5) score += 1
  return { score: Math.round(score * 10) / 10, maxScore: 10, detail: `${count} 种食材`, ingredientCount: count, hasRichDesc: richIngredients.length > 0 }
}

function computeStepClarity(recipe) {
  if (!recipe.steps) return { score: 0, maxScore: 10, detail: '无烹饪步骤' }
  let steps = recipe.steps
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps) } catch { steps = [] }
  }
  if (!Array.isArray(steps) || steps.length === 0) {
    return { score: 0, maxScore: 10, detail: '步骤列表为空' }
  }
  let score = 0
  const count = steps.length
  const timePattern = /\d+\s*(分钟|小时|min|h)/i
  const detailPattern = /(中火|小火|大火|焯水|腌制|翻面|切|煮|炒|煎|炸|蒸|烤|炖|焖|熬)/
  score += Math.min(count, 8) * 0.3
  if (count >= 3) score += 0.5
  if (count >= 5) score += 0.5
  let totalWords = 0; let hasTime = 0; let hasDetail = 0
  steps.forEach(s => {
    const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
    totalWords += text.length
    if (timePattern.test(text)) hasTime++
    if (detailPattern.test(text)) hasDetail++
  })
  const avgWords = totalWords / Math.max(count, 1)
  score += Math.min(avgWords / 20, 3)
  score += Math.min(hasTime / Math.max(count, 1) * 2, 2)
  score += Math.min(hasDetail / Math.max(count, 1), 1)
  return { score: Math.round(score * 10) / 10, maxScore: 10, detail: `${count} 步，平均 ${Math.round(avgWords)} 字/步`, stepCount: count, stepsWithTime: hasTime, stepsWithDetail: hasDetail }
}

function computeNutritionInfo(recipe) {
  if (!recipe.nutrition) return { score: 0, maxScore: 10, detail: '无营养信息' }
  let nutrition = recipe.nutrition
  if (typeof nutrition === 'string') {
    try { nutrition = JSON.parse(nutrition) } catch { nutrition = {} }
  }
  if (!nutrition || typeof nutrition !== 'object') return { score: 0, maxScore: 10, detail: '营养格式异常' }
  const fields = [
    { key: 'calories', label: '热量', weight: 2 },
    { key: 'protein', label: '蛋白质', weight: 2 },
    { key: 'fat', label: '脂肪', weight: 2 },
    { key: 'fiber', label: '纤维', weight: 2 },
    { key: 'sodium', label: '钠', weight: 2 },
  ]
  let score = 0
  fields.forEach(f => {
    if (nutrition[f.key] != null && nutrition[f.key] !== '' && nutrition[f.key] !== 0) score += f.weight
  })
  return { score, maxScore: 10, detail: `${fields.filter(f => nutrition[f.key] != null && nutrition[f.key] !== '' && nutrition[f.key] !== 0).length}/${fields.length} 项已填写` }
}
function computeQualityScore(recipe) {
  const ingredient = computeIngredientCompleteness(recipe)
  const step = computeStepClarity(recipe)
  const nutrition = computeNutritionInfo(recipe)
  return { overall: { score: Math.round((ingredient.score / 10) * 3.5 + (step.score / 10) * 4 + (nutrition.score / 10) * 2.5), maxScore: 10 }, ingredientCompleteness: ingredient, stepClarity: step, nutritionInfo: nutrition }
}

// ── Express App ────────────────────────────────────────────────────────────

function createApp() {
  const app = express()
  app.use(express.json())

  // ── Tags ──
  app.get('/api/tags/popular', async (req, res) => {
    const { limit = 30, minCount = 1 } = req.query
    const tags = await TagSuggestion.findAll({
      where: { count: { [Op.gte]: parseInt(minCount, 10) || 1 } },
      order: [['count', 'DESC']],
      limit: Math.min(parseInt(limit, 10) || 30, 100),
    })
    res.json({ code: 0, data: { list: tags.map(t => ({ tag: t.tag, category: t.category, count: t.count })), total: tags.length } })
  })

  app.get('/api/tags/search', async (req, res) => {
    const { q } = req.query
    if (!q || q.trim().length < 1) return res.json({ code: 0, data: { list: [], total: 0 } })
    const tags = await TagSuggestion.findAll({
      where: { tag: { [Op.like]: `%${q.trim()}%` } },
      order: [['count', 'DESC']],
      limit: 20,
    })
    res.json({ code: 0, data: { list: tags.map(t => ({ tag: t.tag, category: t.category, count: t.count })), total: tags.length } })
  })

  app.post('/api/tags/log', async (req, res) => {
    const { tag, category } = req.body
    if (!tag || !tag.trim()) return res.status(400).json({ code: 400, message: 'tag 必填' })
    const [record] = await TagSuggestion.findOrCreate({
      where: { tag: tag.trim().toLowerCase() },
      defaults: { tag: tag.trim().toLowerCase(), category: category || null, count: 1 },
    })
    if (!record._options.isNewRecord) {
      await record.increment('count', { by: 1 })
    }
    res.json({ code: 0, message: 'ok' })
  })

  // ── Quality ──
  app.get('/api/recipes/:id/quality-details', async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'ingredients', 'steps', 'nutrition', 'qualityScore'],
    })
    if (!recipe) return res.status(404).json({ code: 404, message: '食谱不存在' })
    const details = computeQualityScore(recipe)
    res.json({ code: 0, data: { recipeId: recipe.id, recipeTitle: recipe.title, ...details } })
  })

  // ── Behaviors ──
  app.post('/api/behaviors/track', auth, async (req, res) => {
    const { eventType, recipeId, metadata } = req.body
    if (!eventType || !recipeId) return res.status(400).json({ code: 400, message: 'eventType 和 recipeId 必填' })
    const validTypes = ['view', 'favorite', 'cook', 'share']
    if (!validTypes.includes(eventType)) return res.status(400).json({ code: 400, message: `eventType 必须为: ${validTypes.join(', ')}` })
    const FIVE_MIN = 5 * 60 * 1000
    if (eventType === 'view') {
      const recent = await BehaviorEvent.findOne({
        where: { userId: req.user.id, recipeId, eventType: 'view', timestamp: { [Op.gte]: new Date(Date.now() - FIVE_MIN) } },
        order: [['timestamp', 'DESC']],
      })
      if (recent) {
        await recent.update({ timestamp: new Date() })
        return res.json({ code: 0, message: 'ok', deduped: true })
      }
    }
    const event = await BehaviorEvent.create({ userId: req.user.id, eventType, recipeId, metadata: metadata || null, timestamp: new Date() })
    res.json({ code: 0, message: 'ok', eventId: event.id })
  })

  app.post('/api/behaviors/track-anonymous', async (req, res) => {
    const { eventType, recipeId, metadata } = req.body
    if (!eventType || !recipeId) return res.status(400).json({ code: 400, message: 'eventType 和 recipeId 必填' })
    const validTypes = ['view', 'share']
    if (!validTypes.includes(eventType)) return res.status(400).json({ code: 400, message: `匿名追踪仅支持: ${validTypes.join(', ')}` })
    await BehaviorEvent.create({ userId: 'anonymous', eventType, recipeId, metadata: metadata || null, timestamp: new Date() })
    res.json({ code: 0, message: 'ok' })
  })

  app.get('/api/behaviors/history', auth, async (req, res) => {
    const { limit = 50, eventType } = req.query
    const where = { userId: req.user.id }
    if (eventType) where.eventType = eventType
    const { rows, count } = await BehaviorEvent.findAndCountAll({
      where, order: [['timestamp', 'DESC']], limit: Math.min(parseInt(limit, 10) || 50, 200),
    })
    res.json({ code: 0, data: { list: rows.map(r => ({ id: r.id, eventType: r.eventType, recipeId: r.recipeId, timestamp: r.timestamp })), total: count } })
  })

  app.get('/api/behaviors/stats', auth, async (req, res) => {
    const [viewCount, favoriteCount, cookCount, shareCount] = await Promise.all([
      BehaviorEvent.count({ where: { userId: req.user.id, eventType: 'view' } }),
      BehaviorEvent.count({ where: { userId: req.user.id, eventType: 'favorite' } }),
      BehaviorEvent.count({ where: { userId: req.user.id, eventType: 'cook' } }),
      BehaviorEvent.count({ where: { userId: req.user.id, eventType: 'share' } }),
    ])
    res.json({ code: 0, data: { viewCount, favoriteCount, cookCount, shareCount, total: viewCount + favoriteCount + cookCount + shareCount } })
  })

  // ── Export ──
  app.get('/api/recipes/:id/export', async (req, res) => {
    const { format = 'md' } = req.query
    if (!['md', 'markdown', 'pdf'].includes(format.toLowerCase())) {
      return res.status(400).json({ code: 400, message: '仅支持 format=md 或 format=pdf' })
    }
    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: ['id', 'title', 'description', 'category', 'difficulty', 'servings', 'cookTime', 'preparationTime', 'ingredients', 'steps', 'tips', 'nutrition'],
    })
    if (!recipe) return res.status(404).json({ code: 404, message: '食谱不存在' })
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.send(Buffer.from([0x25, 0x50, 0x44, 0x46])) // Fake PDF header
    } else {
      const md = [`# ${recipe.title}`, '', `> ${recipe.description || ''}`, '', `- 分类: ${recipe.category}`, '']
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.send(md.join('\n'))
    }
  })

  return app
}

describe('Quality Score (compute functions)', () => {
  it('食材完整度 — 空表格返回 0', () => {
    const r = computeIngredientCompleteness({ ingredients: [] })
    expect(r.score).toBe(0)
  })

  it('食材完整度 — 5 种食材应有分数', () => {
    const r = computeIngredientCompleteness({
      ingredients: [
        { name: '番茄' }, { name: '鸡蛋' }, { name: '葱花' },
        { name: '盐' }, { name: '食用油' },
      ],
    })
    expect(r.score).toBeGreaterThan(0)
    expect(r.ingredientCount).toBe(5)
  })

  it('食材完整度 — 无 ingredients 返回 0', () => {
    const r = computeIngredientCompleteness({})
    expect(r.score).toBe(0)
    expect(r.detail).toContain('无食材列表')
  })

  it('步骤清晰度 — 无步骤返回 0', () => {
    const r = computeStepClarity({ steps: [] })
    expect(r.score).toBe(0)
  })

  it('步骤清晰度 — 带时间和动作词的步骤得分更高', () => {
    const r = computeStepClarity({
      steps: [
        { description: '将番茄切块备用，中火加热' },
        { description: '加入鸡蛋翻炒 3 分钟' },
        { description: '加入盐调味，大火收汁 1 分钟' },
      ],
    })
    expect(r.score).toBeGreaterThan(0)
    expect(r.stepCount).toBe(3)
    expect(r.stepsWithTime).toBeGreaterThan(0)
  })

  it('步骤清晰度 — 长描述步骤得分高', () => {
    const r = computeStepClarity({
      steps: [
        { description: '先将番茄洗净切成小块备用，然后在碗中打入三个鸡蛋搅拌均匀' },
        { description: '中火烧热锅中的油，倒入蛋液煎至凝固后盛出' },
        { description: '锅中再加少许油，放入番茄块中火翻炒出汁' },
        { description: '将煎好的鸡蛋倒回锅中，加入盐和糖调味翻炒均匀' },
        { description: '最后撒上葱花，大火收汁即可出锅装盘' },
      ],
    })
    expect(r.score).toBeGreaterThan(3)
  })

  it('营养信息 — 无营养返回 0', () => {
    const r = computeNutritionInfo({})
    expect(r.score).toBe(0)
    expect(r.detail).toContain('无营养信息')
  })

  it('营养信息 — 全填满得 10 分', () => {
    const r = computeNutritionInfo({
      nutrition: JSON.stringify({
        calories: 250, protein: 12, fat: 8, fiber: 3, sodium: 500,
      }),
    })
    expect(r.score).toBe(10)
    expect(r.detail).toContain('5/5')
  })

  it('营养信息 — 部分填得分较低', () => {
    const r = computeNutritionInfo({
      nutrition: { calories: 250, protein: 12 },
    })
    expect(r.score).toBe(4)
    expect(r.detail).toContain('2/5')
  })

  it('综合质量评分 — 空食谱得分最低', () => {
    const r = computeQualityScore({})
    expect(r.overall.score).toBe(0)
  })
})

describe('Tags API', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
    // Seed some tag data
    await TagSuggestion.bulkCreate([
      { tag: '家常菜', category: 'cuisine', count: 15 },
      { tag: '快手菜', category: 'difficulty', count: 12 },
      { tag: '早餐', category: 'meal', count: 8 },
      { tag: '甜点', category: 'cuisine', count: 6 },
      { tag: '辣', category: 'flavor', count: 5 },
    ])
  })

  it('GET /tags/popular 返回热门标签', async () => {
    const res = await request(app).get('/api/tags/popular')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.total).toBeGreaterThanOrEqual(5)
    expect(res.body.data.list[0].tag).toBe('家常菜')
    expect(res.body.data.list[0].count).toBe(15)
  })

  it('GET /tags/popular?limit=2 限制数量', async () => {
    const res = await request(app).get('/api/tags/popular?limit=2')
    expect(res.body.data.list.length).toBe(2)
  })

  it('GET /tags/search?q=快 返回匹配标签', async () => {
    const res = await request(app).get('/api/tags/search?q=' + encodeURIComponent('快'))
    expect(res.body.code).toBe(0)
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(1)
    expect(res.body.data.list[0].tag).toContain('快')
  })

  it('GET /tags/search?q=不存在的标签 返回空', async () => {
    const res = await request(app).get('/api/tags/search?q=zzz999')
    expect(res.body.data.total).toBe(0)
  })

  it('POST /tags/log 记录标签（新建）', async () => {
    const res = await request(app).post('/api/tags/log').send({ tag: '粤菜', category: 'cuisine' })
    expect(res.body.code).toBe(0)
    const created = await TagSuggestion.findOne({ where: { tag: '粤菜' } })
    expect(created).not.toBeNull()
    expect(created.count).toBe(1)
  })

  it('POST /tags/log 记录已有标签递增 count', async () => {
    await request(app).post('/api/tags/log').send({ tag: '家常菜' })
    const tag = await TagSuggestion.findOne({ where: { tag: '家常菜' } })
    expect(tag.count).toBe(16)
  })

  it('POST /tags/log 无 tag 返回 400', async () => {
    const res = await request(app).post('/api/tags/log').send({})
    expect(res.status).toBe(400)
  })
})

describe('Quality Details API', () => {
  let app
  let recipeId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
    const recipe = await Recipe.create({
      id: 'test-recipe-quality-1',
      title: '番茄炒蛋',
      ingredients: JSON.stringify([
        { name: '番茄', amount: '2 个' },
        { name: '鸡蛋', amount: '3 个' },
        { name: '葱花', amount: '适量' },
        { name: '盐', amount: '少许' },
        { name: '食用油', amount: '适量' },
      ]),
      steps: JSON.stringify([
        { description: '番茄洗净切块备用，中火加热' },
        { description: '鸡蛋打散加少许盐搅匀' },
        { description: '热锅凉油，倒入蛋液煎至凝固盛出' },
        { description: '锅中加油，放入番茄块中火翻炒 3 分钟' },
        { description: '倒回鸡蛋，加盐调味翻炒均匀即可' },
      ]),
      nutrition: JSON.stringify({
        calories: 200, protein: 12, fat: 15, fiber: 2, sodium: 400,
      }),
    })
    recipeId = recipe.id
  })

  it('GET /recipes/:id/quality-details 返回多维评分', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/quality-details`)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.recipeTitle).toBe('番茄炒蛋')
    expect(res.body.data.overall).toBeDefined()
    expect(res.body.data.overall.score).toBeGreaterThan(5)
    expect(res.body.data.ingredientCompleteness).toBeDefined()
    expect(res.body.data.ingredientCompleteness.ingredientCount).toBe(5)
    expect(res.body.data.stepClarity).toBeDefined()
    expect(res.body.data.stepClarity.stepCount).toBe(5)
    expect(res.body.data.nutritionInfo).toBeDefined()
    expect(res.body.data.nutritionInfo.detail).toContain('5/5')
  })

  it('GET /recipes/:id/quality-details 不存在的食谱返回 404', async () => {
    const res = await request(app).get('/api/recipes/nonexistent/quality-details')
    expect(res.status).toBe(404)
  })
})

describe('Behaviors API', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
  })

  it('POST /behaviors/track 记录 view 行为', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'view', recipeId: 'recipe-1' })
    expect(res.body.code).toBe(0)
    expect(res.body.eventId).toBeDefined()
  })

  it('POST /behaviors/track 重复 view 5 分钟内去重', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'view', recipeId: 'recipe-1' })
    expect(res.body.deduped).toBe(true)
  })

  it('POST /behaviors/track 记录 favorite', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'favorite', recipeId: 'recipe-2' })
    expect(res.body.code).toBe(0)
  })

  it('POST /behaviors/track 记录 cook', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'cook', recipeId: 'recipe-1', metadata: JSON.stringify({ duration: 30 }) })
    expect(res.body.code).toBe(0)
  })

  it('POST /behaviors/track 记录 share', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'share', recipeId: 'recipe-3' })
    expect(res.body.code).toBe(0)
  })

  it('POST /behaviors/track 无效 eventType 返回 400', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({ eventType: 'invalid', recipeId: 'recipe-1' })
    expect(res.status).toBe(400)
  })

  it('POST /behaviors/track 无参数返回 400', async () => {
    const res = await request(app)
      .post('/api/behaviors/track')
      .send({})
    expect(res.status).toBe(400)
  })

  it('POST /behaviors/track-anonymous 匿名追踪', async () => {
    const res = await request(app)
      .post('/api/behaviors/track-anonymous')
      .send({ eventType: 'view', recipeId: 'recipe-1' })
    expect(res.body.code).toBe(0)
  })

  it('POST /behaviors/track-anonymous 不支持的 eventType 返回 400', async () => {
    const res = await request(app)
      .post('/api/behaviors/track-anonymous')
      .send({ eventType: 'favorite', recipeId: 'recipe-1' })
    expect(res.status).toBe(400)
  })

  it('GET /behaviors/history 返回行为历史', async () => {
    const res = await request(app).get('/api/behaviors/history')
    expect(res.body.code).toBe(0)
    expect(res.body.data.total).toBeGreaterThanOrEqual(1)
  })

  it('GET /behaviors/history?eventType=view 筛选', async () => {
    const res = await request(app).get('/api/behaviors/history?eventType=view')
    expect(res.body.code).toBe(0)
    res.body.data.list.forEach(e => {
      expect(e.eventType).toBe('view')
    })
  })

  it('GET /behaviors/stats 返回统计', async () => {
    const res = await request(app).get('/api/behaviors/stats')
    expect(res.body.code).toBe(0)
    expect(res.body.data.viewCount).toBeGreaterThanOrEqual(1)
    expect(res.body.data.favoriteCount).toBeGreaterThanOrEqual(1)
    expect(res.body.data.cookCount).toBe(1)
    expect(res.body.data.shareCount).toBe(1)
  })
})

describe('Export API', () => {
  let app
  let recipeId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
    app = createApp()
    const recipe = await Recipe.create({
      id: 'export-test-recipe-1',
      title: '番茄炒蛋',
      description: '经典家常菜',
      category: '中餐',
      difficulty: '简单',
      servings: '2 人份',
      cookTime: '15 分钟',
      ingredients: JSON.stringify([{ name: '番茄', amount: '2 个' }, { name: '鸡蛋', amount: '3 个' }]),
      steps: JSON.stringify([
        { description: '番茄切块' },
        { description: '鸡蛋打散炒熟' },
      ]),
      tips: '鸡蛋要嫩',
      nutrition: JSON.stringify({ calories: 200, protein: 12 }),
    })
    recipeId = recipe.id
  })

  it('GET /recipes/:id/export?format=md 返回 Markdown', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/export?format=md`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.text).toContain('# 番茄炒蛋')
    expect(res.text).toContain('经典家常菜')
  })

  it('GET /recipes/:id/export?format=pdf 返回 PDF', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/export?format=pdf`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
  })

  it('GET /recipes/:id/export?format=invalid 返回 400', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/export?format=invalid`)
    expect(res.status).toBe(400)
  })

  it('GET /recipes/:id/export 不存在的食谱返回 404', async () => {
    const res = await request(app).get('/api/recipes/nonexistent/export')
    expect(res.status).toBe(404)
  })
})