'use strict'

/**
 * tests/content_quality.test.js
 * Iter#97 P1: 内容质量仪表板单元测试
 *
 * 测试范围：
 *   1. /api/admin/content-quality 端点可达
 *   2. fieldCoverage 包含 8 个字段
 *   3. bottomRecipes 按 score 升序且最多 10 条
 */

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

// ── Inline model definitions (same as nutrition_calibration test) ──
const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('ingredients')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  steps: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('steps')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  nutrition: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('nutrition')
      if (!raw) return null
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return null }
    },
  },
  coverImage: { type: DataTypes.TEXT, allowNull: true },
  story: { type: DataTypes.TEXT, allowNull: true },
  culturalBackground: { type: DataTypes.TEXT, allowNull: true },
  tips: { type: DataTypes.TEXT, allowNull: true },
  cookTime: { type: DataTypes.INTEGER, allowNull: true },
  difficulty: { type: DataTypes.STRING, allowNull: true },
  servings: { type: DataTypes.INTEGER, allowNull: true },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  userId: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'recipes', timestamps: false })

// ── Inline VideoEmbed model (for video coverage check) ──
const VideoEmbed = sequelize.define('VideoEmbed', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipeId: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  platform: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'video_embeds', timestamps: false })

// ── Helper: parse raw fields (mimics admin.js parseRawFields) ──
function parseRawFields(recipe) {
  const r = { ...recipe }
  for (const field of ['ingredients', 'steps', 'nutrition', 'categoryTags']) {
    if (typeof r[field] === 'string') {
      try { r[field] = JSON.parse(r[field]) } catch { r[field] = null }
    }
  }
  return r
}

// ── Minimal content-quality route (ported from admin.js) ──
function createContentQualityRouter() {
  const router = express.Router()

  router.get('/admin/content-quality', async (req, res) => {
    try {
      const allRecipes = await Recipe.findAll({
        attributes: ['id', 'title', 'coverImage', 'ingredients', 'steps', 'nutrition', 'story', 'culturalBackground', 'tips'],
        raw: true,
      })

      const videoCounts = await VideoEmbed.findAll({
        attributes: ['recipeId', [Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt']],
        group: ['recipeId'],
        raw: true,
      })
      const videoMap = {}
      videoCounts.forEach(v => { videoMap[v.recipeId] = v.cnt })

      let totalCover = 0, totalIng = 0, totalStep = 0, totalNut = 0, totalStory = 0, totalCulture = 0, totalTips = 0, totalVideo = 0
      const scoredRecipes = []

      for (const r of allRecipes) {
        const parsed = parseRawFields(r)
        let score = 0
        const missingFields = []

        const hasCover = !!(parsed.coverImage && parsed.coverImage.includes('http'))
        if (hasCover) { score += 1; totalCover++ } else { missingFields.push('coverImage') }

        const hasIng = Array.isArray(parsed.ingredients) && parsed.ingredients.length >= 2
        if (hasIng) { score += 1; totalIng++ } else { missingFields.push('ingredients') }

        const hasStep = Array.isArray(parsed.steps) && parsed.steps.length >= 2
        if (hasStep) { score += 1; totalStep++ } else { missingFields.push('steps') }

        let hasNut = false
        if (parsed.nutrition && typeof parsed.nutrition === 'object') {
          const nut = parsed.nutrition
          const nutKeys = Object.keys(nut).filter(k => nut[k] != null && nut[k] !== '')
          hasNut = !!(nut.calories != null && nutKeys.length >= 3)
        }
        if (hasNut) { score += 1; totalNut++ } else { missingFields.push('nutrition') }

        const hasStory = !!(parsed.story && parsed.story.trim().length >= 20)
        if (hasStory) { score += 1; totalStory++ } else { missingFields.push('story') }

        const hasCulture = !!(parsed.culturalBackground && parsed.culturalBackground.trim().length >= 20)
        if (hasCulture) { score += 1; totalCulture++ } else { missingFields.push('culturalBackground') }

        const hasTips = !!(parsed.tips && parsed.tips.trim().length >= 10)
        if (hasTips) { score += 1; totalTips++ } else { missingFields.push('tips') }

        const hasVideo = !!(videoMap[r.id] && videoMap[r.id] > 0)
        if (hasVideo) { score += 1; totalVideo++ } else { missingFields.push('video') }

        // fieldStatus (for full recipes list)
        const fieldStatus = {
          coverImage: hasCover,
          ingredients: hasIng,
          steps: hasStep,
          nutrition: hasNut,
          story: hasStory,
          culturalBackground: hasCulture,
          tips: hasTips,
          video: hasVideo,
        }

        scoredRecipes.push({ id: r.id, title: r.title, score, missingFields, fieldStatus })
      }

      const total = allRecipes.length
      const fieldCoverage = {
        coverImage: { count: totalCover, pct: total > 0 ? Number((totalCover / total * 100).toFixed(1)) : 0 },
        ingredients: { count: totalIng, pct: total > 0 ? Number((totalIng / total * 100).toFixed(1)) : 0 },
        steps: { count: totalStep, pct: total > 0 ? Number((totalStep / total * 100).toFixed(1)) : 0 },
        nutrition: { count: totalNut, pct: total > 0 ? Number((totalNut / total * 100).toFixed(1)) : 0 },
        story: { count: totalStory, pct: total > 0 ? Number((totalStory / total * 100).toFixed(1)) : 0 },
        culturalBackground: { count: totalCulture, pct: total > 0 ? Number((totalCulture / total * 100).toFixed(1)) : 0 },
        tips: { count: totalTips, pct: total > 0 ? Number((totalTips / total * 100).toFixed(1)) : 0 },
        video: { count: totalVideo, pct: total > 0 ? Number((totalVideo / total * 100).toFixed(1)) : 0 },
      }

      scoredRecipes.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))

      const avg = total > 0 ? scoredRecipes.reduce((s, r) => s + r.score, 0) / total : 0
      const distribution = {}
      scoredRecipes.forEach(r => {
        const key = `${r.score}分`
        distribution[key] = (distribution[key] || 0) + 1
      })

      res.json({
        code: 0,
        data: {
          totalRecipes: total,
          fieldCoverage,
          overallScore: { avg: Number(avg.toFixed(1)), distribution },
          bottomRecipes: scoredRecipes.slice(0, 10).map(r => ({
            id: r.id, title: r.title, score: r.score, missingFields: r.missingFields,
          })),
          recipes: scoredRecipes.map(r => ({
            id: r.id, title: r.title, score: r.score, fieldStatus: r.fieldStatus,
          })),
        },
      })
    } catch (err) {
      console.error('[GET /admin/content-quality] Error:', err)
      res.status(500).json({ code: 500, message: 'Internal server error', data: null })
    }
  })

  return router
}

// ─── Test Suite ──────────────────────────────────────────────
describe('Iter#97 P1: Content Quality Dashboard', () => {
  let app

  beforeAll(async () => {
    await sequelize.sync({ force: true })

    // Create test recipes with varying quality
    // 1. Complete recipe (score=8)
    await Recipe.create({
      id: 'complete-001', title: '完美食谱',
      coverImage: 'http://example.com/cover.jpg',
      ingredients: JSON.stringify([{ name: '鸡蛋' }, { name: '面粉' }, { name: '糖' }]),
      steps: JSON.stringify([{ content: '搅拌' }, { content: '烘烤' }, { content: '装饰' }]),
      nutrition: JSON.stringify({ calories: 300, protein: 10, fat: 5, carbs: 40, fiber: 2, sodium: 100 }),
      story: '这是一道充满故事的家常菜，背后有着温暖的回忆...',
      culturalBackground: '这道菜源自中国北方，有着悠久的文化历史...',
      tips: '烘烤时注意温度控制，建议预热到180度。',
    })

    // 2. Low quality (only score=2: has cover + steps)
    await Recipe.create({
      id: 'low-002', title: '残缺食谱',
      coverImage: 'http://example.com/cover.jpg',
      ingredients: JSON.stringify([{ name: '鸡蛋' }]),
      steps: JSON.stringify([{ content: '搅拌' }]),
      nutrition: null,
      story: '短',
      culturalBackground: null,
      tips: null,
    })

    // 3. Medium quality (score=5: cover + ing + step + story)
    await Recipe.create({
      id: 'mid-003', title: '中等食谱',
      coverImage: 'http://example.com/cover.jpg',
      ingredients: JSON.stringify([{ name: '鸡肉' }, { name: '青菜' }, { name: '姜' }, { name: '蒜' }]),
      steps: JSON.stringify([{ content: '备菜' }, { content: '炒制' }, { content: '调味' }, { content: '装盘' }]),
      nutrition: null,
      story: '这是一道传承多年的家常菜，每一口都充满家的味道。',
      culturalBackground: null,
      tips: null,
    })

    // 4. No cover (score=7: no coverImage)
    await Recipe.create({
      id: 'nocover-004', title: '无封面食谱',
      coverImage: 'relative/path.jpg',  // no http prefix
      ingredients: JSON.stringify([{ name: '鱼' }, { name: '葱' }, { name: '姜' }]),
      steps: JSON.stringify([{ content: '清理' }, { content: '蒸制' }, { content: '调味' }]),
      nutrition: JSON.stringify({ calories: 200, protein: 20, fat: 8, carbs: 0 }),
      story: '这是一道鲜美的清蒸鱼，做法简单却美味无比...',
      culturalBackground: '清蒸是粤菜的经典烹饪手法，保留了食材的原汁原味。',
      tips: '蒸鱼时水开后再放入，大火蒸8分钟即可。',
    })

    // Add video for first recipe
    await VideoEmbed.create({ recipeId: 'complete-001', url: 'http://example.com/video', platform: 'youtube' })

    app = express()
    app.use(express.json())
    app.use('/api', createContentQualityRouter())
  })

  test('1. GET /api/admin/content-quality returns 200', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
  })

  test('2. fieldCoverage contains all 8 fields', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    const coverage = res.body.data.fieldCoverage
    const expectedFields = ['coverImage', 'ingredients', 'steps', 'nutrition', 'story', 'culturalBackground', 'tips', 'video']

    expectedFields.forEach(f => {
      expect(coverage).toHaveProperty(f)
      expect(coverage[f]).toHaveProperty('count')
      expect(coverage[f]).toHaveProperty('pct')
    })

    expect(Object.keys(coverage).length).toBe(8)
  })

  test('3. coverage counts are correct (4 recipes)', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    const c = res.body.data.fieldCoverage

    // coverImage: only complete-001 and low-002 and mid-003 have http cover
    expect(c.coverImage.count).toBe(3)
    // ingredients >= 2: complete-001(3), mid-003(4), nocover-004(3)
    expect(c.ingredients.count).toBe(3)
    // steps >= 2: complete-001(3), mid-003(4), nocover-004(3)
    expect(c.steps.count).toBe(3)
    // nutrition with calories+2 other: complete-001, nocover-004
    expect(c.nutrition.count).toBe(2)
    // story >=20 chars: complete-001, mid-003, nocover-004
    expect(c.story.count).toBe(3)
    // culturalBackground >=20 chars: complete-001, nocover-004
    expect(c.culturalBackground.count).toBe(2)
    // tips >=10 chars: complete-001, nocover-004
    expect(c.tips.count).toBe(2)
    // video: only complete-001
    expect(c.video.count).toBe(1)
  })

  test('4. totalRecipes is correct', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    expect(res.body.data.totalRecipes).toBe(4)
  })

  test('5. overallScore.avg is computed correctly', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    const avg = res.body.data.overallScore.avg
    // Scores: complete-001=8, low-002=1, mid-003=4, nocover-004=6
    //   low-002: only cover (ingredients.length=1 <2, steps.length=1 <2)
    //   mid-003: cover+ing+step+story = 4 (no nutrition, no culture, no tips, no video)
    //   nocover-004: ing+step+nut+story+culture+tips = 6 (coverImage no http)
    // avg = (8+1+4+6)/4 = 4.75 ≈ 4.8
    expect(avg).toBeCloseTo(4.8, 1)
  })

  test('6. bottomRecipes sorted by score ascending, max 10 items', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    const bottom = res.body.data.bottomRecipes

    expect(bottom.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < bottom.length; i++) {
      expect(bottom[i].score).toBeGreaterThanOrEqual(bottom[i - 1].score)
    }
  })

  test('7. bottomRecipes[0] is the lowest quality (low-002)', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    expect(res.body.data.bottomRecipes[0].id).toBe('low-002')
    expect(res.body.data.bottomRecipes[0].score).toBe(1)
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('ingredients')
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('steps')
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('nutrition')
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('video')
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('tips')
    expect(res.body.data.bottomRecipes[0].missingFields).toContain('culturalBackground')
  })

  test('8. bottomRecipes items have missingFields array', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    res.body.data.bottomRecipes.forEach(r => {
      expect(Array.isArray(r.missingFields)).toBe(true)
    })
  })

  test('9. video field reflects VideoEmbed association', async () => {
    const res = await request(app).get('/api/admin/content-quality')
    const completeRecipe = res.body.data.recipes.find(r => r.id === 'complete-001')
    const lowRecipe = res.body.data.recipes.find(r => r.id === 'low-002')

    expect(completeRecipe.fieldStatus.video).toBe(true)
    expect(lowRecipe.fieldStatus.video).toBe(false)
  })
})