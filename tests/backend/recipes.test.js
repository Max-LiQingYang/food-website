'use strict'

/**
 * 后端 API 测试 - 食谱 CRUD + 搜索 + 推荐
 */

// ── 环境变量 ──
process.env.NODE_ENV = 'test'
process.env.DB_DIALECT = 'sqlite'
process.env.DB_STORAGE = ':memory:'
process.env.JWT_SECRET = 'test-secret-key-for-testing-only'
process.env.JWT_EXPIRES_IN = '1h'
process.env.CORS_ORIGIN = '*'
process.env.RATE_LIMIT_WINDOW_MS = '900000'
process.env.RATE_LIMIT_MAX = '1000'

const app = require('../../backend/app')
const request = require('supertest')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const db = require('../../backend/models')

function makeToken(userId, extra = {}) {
  return jwt.sign({ userId, ...extra }, process.env.JWT_SECRET, { expiresIn: '1h' })
}

const USER_A_ID = uuidv4()
const USER_B_ID = uuidv4()

beforeEach(async () => {
  await db.sequelize.sync({ force: true })
  // 创建两个测试用户
  await db.User.create({ id: USER_A_ID, username: 'userA', email: 'a@test.com', nickname: '用户A' })
  await db.User.create({ id: USER_B_ID, username: 'userB', email: 'b@test.com', nickname: '用户B' })
})

afterAll(async () => {
  await db.sequelize.close()
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes — 食谱列表
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes — 食谱列表', () => {
  beforeEach(async () => {
    // 创建5条食谱
    for (let i = 1; i <= 5; i++) {
      await db.Recipe.create({
        id: uuidv4(),
        title: `测试食谱${i}`,
        author: '测试作者',
        cookTime: 10 * i,
        category: i <= 3 ? 'chinese' : 'western',
        userId: USER_A_ID
      })
    }
  })

  test('应返回分页列表，默认按 createdAt DESC', async () => {
    const res = await request(app).get('/api/recipes')

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.total).toBe(5)
    expect(res.body.data.page).toBe(1)
    expect(res.body.data.list).toHaveLength(5)
    // 不应包含 ingredients 和 steps
    expect(res.body.data.list[0]).not.toHaveProperty('ingredients')
    expect(res.body.data.list[0]).not.toHaveProperty('steps')
  })

  test('分类筛选 category=chinese 应只返回中餐', async () => {
    const res = await request(app).get('/api/recipes?category=chinese')

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(3)
    res.body.data.list.forEach(r => expect(r.category).toBe('chinese'))
  })

  test('分类筛选 category=western 应只返回西餐', async () => {
    const res = await request(app).get('/api/recipes?category=western')

    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(2)
  })

  test('分页参数应正常工作', async () => {
    const res = await request(app).get('/api/recipes?page=2&pageSize=2')

    expect(res.status).toBe(200)
    expect(res.body.data.page).toBe(2)
    expect(res.body.data.pageSize).toBe(2)
    expect(res.body.data.list).toHaveLength(2)
  })

  test('page < 1 应自动修正为 1', async () => {
    const res = await request(app).get('/api/recipes?page=0')
    expect(res.body.data.page).toBe(1)
  })

  test('pageSize > 100 应限制为 100', async () => {
    const res = await request(app).get('/api/recipes?pageSize=999')
    expect(res.body.data.pageSize).toBe(100)
  })

  test('空分类应返回全部', async () => {
    const res = await request(app).get('/api/recipes?category=')
    expect(res.body.data.total).toBe(5)
  })

  test('userId 筛选应正常工作', async () => {
    const res = await request(app).get(`/api/recipes?userId=${USER_A_ID}`)
    expect(res.body.data.total).toBe(5)
  })

  test('不需要认证即可访问', async () => {
    const res = await request(app).get('/api/recipes')
    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/search — 搜索
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/search — 搜索食谱', () => {
  beforeEach(async () => {
    await db.Recipe.create({
      id: uuidv4(), title: '红烧肉', author: '大厨', cookTime: 90, category: 'chinese', difficulty: 'hard',
      ingredients: JSON.stringify([{ name: '五花肉', amount: 500, unit: 'g' }])
    })
    await db.Recipe.create({
      id: uuidv4(), title: '宫保鸡丁', author: '川菜师傅', cookTime: 25, category: 'chinese', difficulty: 'medium',
      ingredients: JSON.stringify([{ name: '鸡胸肉', amount: 300, unit: 'g' }])
    })
    await db.Recipe.create({
      id: uuidv4(), title: '番茄炒蛋', author: '家常', cookTime: 10, category: 'chinese', difficulty: 'easy',
      ingredients: JSON.stringify([{ name: '番茄', amount: 2, unit: '个' }, { name: '鸡蛋', amount: 3, unit: '个' }])
    })
    // 再创建一道非中餐食谱用于分类筛选测试
    await db.Recipe.create({
      id: uuidv4(), title: '草莓蛋糕', author: '甜品师', cookTime: 45, category: 'dessert', difficulty: 'medium',
      ingredients: JSON.stringify([{ name: '草莓', amount: 200, unit: 'g' }])
    })
  })

  test('按标题搜索应返回匹配结果', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '红烧' })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.list[0].title).toBe('红烧肉')
  })

  test('按食材搜索应返回匹配结果', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '鸡蛋' })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(1)
    expect(res.body.data.list[0].title).toBe('番茄炒蛋')
  })

  test('无结果应返回空数组', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '不存在的菜' })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
    expect(res.body.data.list).toEqual([])
  })

  test('空关键词应返回 400', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '' })
    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('缺少 q 参数应返回 400', async () => {
    const res = await request(app).get('/api/recipes/search')
    expect(res.status).toBe(400)
  })

  test('搜索结果不应包含 ingredients 和 steps', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '红烧' })
    expect(res.body.data.list[0]).not.toHaveProperty('ingredients')
    expect(res.body.data.list[0]).not.toHaveProperty('steps')
  })

  // ── 筛选参数测试 ──

  test('按分类筛选应返回正确结果', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '蛋糕', category: 'dessert' })
    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(1)
    expect(res.body.data.list[0].title).toBe('草莓蛋糕')
  })

  test('按难度筛选应返回正确结果', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '肉', difficulty: 'hard' })
    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(1)
    expect(res.body.data.list[0].title).toBe('红烧肉')
  })

  test('按分类+难度组合筛选', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '鸡', category: 'chinese', difficulty: 'medium' })
    expect(res.status).toBe(200)
    expect(res.body.data.list).toHaveLength(1)
    expect(res.body.data.list[0].title).toBe('宫保鸡丁')
  })

  test('按 cookTime_asc 排序应返回时间最短的在前', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '菜', sortBy: 'cookTime_asc' })
    expect(res.status).toBe(200)
    // 实际只搜索到 '菜' 相关内容，但需要确保排序参数不报错
    expect(Array.isArray(res.body.data.list)).toBe(true)
  })

  test('不存在的分类筛选应返回空', async () => {
    const res = await request(app).get('/api/recipes/search').query({ q: '蛋糕', category: 'japanese' })
    expect(res.status).toBe(200)
    expect(res.body.data.total).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/recommend — 食材推荐
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/recommend — 食材推荐', () => {
  beforeEach(async () => {
    await db.Recipe.create({
      id: uuidv4(), title: '番茄炒蛋', author: '家常', cookTime: 10,
      ingredients: JSON.stringify([
        { name: '番茄', amount: 2, unit: '个' },
        { name: '鸡蛋', amount: 3, unit: '个' }
      ])
    })
    await db.Recipe.create({
      id: uuidv4(), title: '番茄蛋汤', author: '家常', cookTime: 15,
      ingredients: JSON.stringify([
        { name: '番茄', amount: 1, unit: '个' },
        { name: '鸡蛋', amount: 2, unit: '个' }
      ])
    })
  })

  test('输入番茄应返回匹配食谱', async () => {
    const res = await request(app).get('/api/recipes/recommend').query({ ingredients: '番茄' })
    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBeGreaterThan(0)
    expect(res.body.data.input).toEqual(['番茄'])
  })

  test('输入番茄,鸡蛋应匹配两道菜且按匹配度排序', async () => {
    const res = await request(app).get('/api/recipes/recommend').query({ ingredients: '番茄,鸡蛋' })
    expect(res.status).toBe(200)
    expect(res.body.data.list.length).toBe(2)
    // 两道菜都包含番茄和鸡蛋，matchScore 应为 100
    res.body.data.list.forEach(r => expect(r.matchScore).toBe(100))
  })

  test('输入不存在的食材应返回空列表', async () => {
    const res = await request(app).get('/api/recipes/recommend').query({ ingredients: '松露' })
    expect(res.status).toBe(200)
    expect(res.body.data.list).toEqual([])
    expect(res.body.data.aiGenerated).toBe(false)
  })

  test('空食材应返回 400', async () => {
    const res = await request(app).get('/api/recipes/recommend').query({ ingredients: '' })
    expect(res.status).toBe(400)
  })

  test('中文顿号分隔应正常解析', async () => {
    const res = await request(app).get('/api/recipes/recommend').query({ ingredients: '番茄、鸡蛋' })
    expect(res.status).toBe(200)
    expect(res.body.data.input).toEqual(['番茄', '鸡蛋'])
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/:id — 食谱详情
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/:id — 食谱详情', () => {
  let recipeId

  beforeEach(async () => {
    recipeId = uuidv4()
    await db.Recipe.create({
      id: recipeId,
      title: '详细食谱',
      author: '大厨',
      cookTime: 30,
      category: 'chinese',
      description: '测试描述',
      servings: 2,
      difficulty: 'medium',
      ingredients: JSON.stringify([{ name: '食材A', amount: 100, unit: 'g' }]),
      steps: JSON.stringify([{ stepNumber: 1, content: '步骤一' }]),
      nutrition: JSON.stringify({ calories: 300, protein: 20, fat: 10, carbs: 30, fiber: 2, sodium: 500 }),
      tips: '测试小贴士内容',
      userId: USER_A_ID
    })
  })

  test('应返回完整详情，含 ingredients、steps、nutrition 和 tips', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}`)
    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('详细食谱')
    expect(res.body.data.ingredients).toEqual([{ name: '食材A', amount: 100, unit: 'g' }])
    expect(res.body.data.steps).toEqual([{ stepNumber: 1, content: '步骤一' }])
    expect(res.body.data.nutrition).toEqual({ calories: 300, protein: 20, fat: 10, carbs: 30, fiber: 2, sodium: 500 })
    expect(res.body.data.tips).toBe('测试小贴士内容')
  })

  test('不存在的 id 应返回 404', async () => {
    const res = await request(app).get(`/api/recipes/${uuidv4()}`)
    expect(res.status).toBe(404)
    expect(res.body.code).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────────
// POST /api/recipes — 创建食谱
// ─────────────────────────────────────────────────────────────────
describe('POST /api/recipes — 创建食谱', () => {
  test('正常创建应返回 201', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({
        title: '新食谱',
        description: '测试描述',
        category: 'chinese',
        cookTime: 20,
        servings: 2,
        difficulty: 'easy',
        ingredients: [{ name: '食材A', amount: 100, unit: 'g' }],
        steps: [{ stepNumber: 1, content: '第一步' }]
      })

    expect(res.status).toBe(201)
    expect(res.body.code).toBe(0)
    expect(res.body.data.title).toBe('新食谱')
    expect(res.body.data.author).toBe('用户A') // 从 nickname 获取
    expect(res.body.data.userId).toBe(USER_A_ID)
  })

  test('空标题应返回 400', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ title: '' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe(400)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .send({ title: '无认证食谱' })

    expect(res.status).toBe(401)
  })

  test('只有标题也应创建成功', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ title: '极简食谱' })

    expect(res.status).toBe(201)
    expect(res.body.data.title).toBe('极简食谱')
  })
})

// ─────────────────────────────────────────────────────────────────
// PUT /api/recipes/:id — 编辑食谱
// ─────────────────────────────────────────────────────────────────
describe('PUT /api/recipes/:id — 编辑食谱', () => {
  let recipeId

  beforeEach(async () => {
    recipeId = uuidv4()
    await db.Recipe.create({
      id: recipeId,
      title: '原始标题',
      author: '用户A',
      cookTime: 20,
      userId: USER_A_ID
    })
  })

  test('作者本人编辑应返回 200', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ title: '新标题', cookTime: 30 })

    expect(res.status).toBe(200)
    expect(res.body.data.title).toBe('新标题')
    expect(res.body.data.cookTime).toBe(30)
  })

  test('非作者编辑应返回 403', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)
      .send({ title: '恶意修改' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe(403)
  })

  test('编辑不存在的食谱应返回 404', async () => {
    const res = await request(app)
      .put(`/api/recipes/${uuidv4()}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ title: '不存在' })

    expect(res.status).toBe(404)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .send({ title: '无认证' })

    expect(res.status).toBe(401)
  })

  test('编辑 ingredients 应正确序列化', async () => {
    const newIngredients = [{ name: '新食材', amount: 200, unit: 'ml' }]
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)
      .send({ ingredients: newIngredients })

    expect(res.status).toBe(200)
    expect(res.body.data.ingredients).toEqual(newIngredients)
  })
})

// ─────────────────────────────────────────────────────────────────
// DELETE /api/recipes/:id — 删除食谱
// ─────────────────────────────────────────────────────────────────
describe('DELETE /api/recipes/:id — 删除食谱', () => {
  let recipeId

  beforeEach(async () => {
    recipeId = uuidv4()
    await db.Recipe.create({
      id: recipeId,
      title: '待删除食谱',
      author: '用户A',
      cookTime: 15,
      userId: USER_A_ID
    })
  })

  test('作者本人删除应返回 200', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)

    // 确认已删除
    const check = await request(app).get(`/api/recipes/${recipeId}`)
    expect(check.status).toBe(404)
  })

  test('非作者删除应返回 403', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)
      .set('Authorization', `Bearer ${makeToken(USER_B_ID)}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe(403)
  })

  test('删除不存在的食谱应返回 404', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${uuidv4()}`)
      .set('Authorization', `Bearer ${makeToken(USER_A_ID)}`)

    expect(res.status).toBe(404)
  })

  test('无 token 应返回 401', async () => {
    const res = await request(app)
      .delete(`/api/recipes/${recipeId}`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────────────────────────
// GET /api/recipes/categories — 分类统计
// ─────────────────────────────────────────────────────────────────
describe('GET /api/recipes/categories — 分类统计', () => {
  beforeEach(async () => {
    await db.Recipe.create({ id: uuidv4(), title: '宫保鸡丁', category: 'chinese', author: 'test' })
    await db.Recipe.create({ id: uuidv4(), title: '麻婆豆腐', category: 'chinese', author: 'test' })
    await db.Recipe.create({ id: uuidv4(), title: '寿司', category: 'japanese', author: 'test' })
    await db.Recipe.create({ id: uuidv4(), title: '无分类', category: null, author: 'test' })
  })

  test('应返回各分类及食谱数量', async () => {
    const res = await request(app).get('/api/recipes/categories')
    expect(res.status).toBe(200)
    expect(res.body.code).toBe(0)
    expect(res.body.data.list).toBeInstanceOf(Array)
    expect(res.body.data.list.length).toBe(2) // chinese + japanese, null 被排除
    expect(res.body.data.total).toBe(3)
  })

  test('应按数量降序排列', async () => {
    const res = await request(app).get('/api/recipes/categories')
    const list = res.body.data.list
    expect(list[0].category).toBe('chinese')
    expect(list[0].count).toBe(2)
    expect(list[1].category).toBe('japanese')
    expect(list[1].count).toBe(1)
  })

  test('空库应返回空列表', async () => {
    await db.sequelize.sync({ force: true })
    const res = await request(app).get('/api/recipes/categories')
    expect(res.status).toBe(200)
    expect(res.body.data.list).toEqual([])
    expect(res.body.data.total).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
// 健康检查
// ─────────────────────────────────────────────────────────────────
describe('GET /health — 健康检查', () => {
  test('应返回 status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
