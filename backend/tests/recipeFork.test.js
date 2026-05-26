/**
 * @jest-environment node
 */

process.env.DATABASE_URL = 'sqlite::memory:'
process.env.DB_DIALECT = 'sqlite'
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'

const { RecipeFork, Recipe, User, sequelize } = require('../models')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const express = require('express')
const request = require('supertest')

// Build a minimal test app with ONLY the fork routes
function createTestApp() {
  const app = express()
  app.use(express.json())

  // Auth middleware for testing
  const authMiddleware = require('../middleware/auth')

  // Mount the fork routes directly
  const router = require('../routes/recipeForks')
  app.use('/api/recipes', (req, res, next) => {
    // Override auth for test: inject userId for authorized header
    if (req.headers['authorization']) {
      return authMiddleware(req, res, next)
    }
    next()
  })
  app.use('/api/recipes', router)

  return app
}

let app
let token
let userId
let recipeId
let user2Id
let forkedRecipeId

beforeAll(async () => {
  await sequelize.sync({ force: true })

  const hash = await bcrypt.hash('test123', 10)
  const user = await User.create({
    id: '10000000-0000-0000-0000-000000000001',
    username: 'forkuser',
    email: 'fork@test.com',
    password: hash,
    nickname: 'ForkUser'
  })
  userId = user.id

  const user2 = await User.create({
    id: '10000000-0000-0000-0000-000000000002',
    username: 'authoruser',
    email: 'author@test.com',
    password: hash,
    nickname: 'AuthorUser'
  })
  user2Id = user2.id

  token = jwt.sign(
    { userId: userId, username: 'forkuser', role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  recipeId = (await Recipe.create({
    id: '10000000-0000-0000-0000-000000000010',
    title: '番茄炒蛋',
    category: 'chinese',
    cookTime: 15,
    servings: 2,
    difficulty: 'easy',
    ingredients: JSON.stringify([{ name: '番茄', amount: 2, unit: '个' }]),
    steps: JSON.stringify([{ stepNumber: 1, content: '切' }]),
    userId: user2Id,
    viewCount: 0
  })).id

  app = createTestApp()
})

describe('Recipe Fork API', () => {
  test('POST /api/recipes/:id/fork — 401 without auth', async () => {
    const res = await request(app).post(`/api/recipes/${recipeId}/fork`)
    expect(res.statusCode).toBe(401)
  })

  test('POST /api/recipes/:id/fork — 404 for nonexistent recipe', async () => {
    const res = await request(app)
      .post('/api/recipes/nonexistent-id/fork')
      .set('Authorization', `Bearer ${token}`)
    expect(res.statusCode).toBe(404)
  })

  test('POST /api/recipes/:id/fork — create fork', async () => {
    const res = await request(app)
      .post(`/api/recipes/${recipeId}/fork`)
      .set('Authorization', `Bearer ${token}`)
      .send({ changesNote: '减少糖量' })
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.recipeId).toBeDefined()
    expect(res.body.title).toContain('改编')

    const fork = await RecipeFork.findOne({ where: { forkedByUserId: userId } })
    expect(fork).not.toBeNull()
    expect(fork.changesNote).toBe('减少糖量')

    const forkedRecipe = await Recipe.findByPk(res.body.recipeId)
    expect(forkedRecipe).not.toBeNull()
    expect(forkedRecipe.title).toContain('改编')

    forkedRecipeId = res.body.recipeId
  })

  test('GET /api/recipes/:id/forks — return forks for original', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/forks`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.forks)).toBe(true)
    expect(res.body.count).toBeGreaterThanOrEqual(1)
    expect(res.body.forks[0].title).toBeDefined()
  })

  test('GET /api/recipes/:id/fork-lineage — original recipe (not a fork)', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}/fork-lineage`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.isFork).toBe(false)
  })

  test('GET /api/recipes/:id/fork-lineage — forked recipe shows ancestors', async () => {
    const res = await request(app).get(`/api/recipes/${forkedRecipeId}/fork-lineage`)
    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.isFork).toBe(true)
    expect(Array.isArray(res.body.lineage)).toBe(true)
    expect(res.body.lineage.length).toBeGreaterThanOrEqual(1)
  })

  test('Chain fork works (fork from a fork)', async () => {
    const res = await request(app)
      .post(`/api/recipes/${forkedRecipeId}/fork`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.statusCode).toBe(200)
    const deepForkId = res.body.recipeId

    // Lineage should have original in it
    const linRes = await request(app).get(`/api/recipes/${deepForkId}/fork-lineage`)
    expect(linRes.statusCode).toBe(200)
    expect(linRes.body.isFork).toBe(true)
    expect(linRes.body.forkDepth).toBeGreaterThanOrEqual(1)

    const titles = linRes.body.lineage.map((l) => l.title || l.name)
    expect(titles.some((t) => t.includes('番茄炒蛋')) || titles.some((t) => t === '番茄炒蛋')).toBe(true)
  })

  test('Details page includes sourceInfo structure', async () => {
    // Verify the sourceInfo shape that would be injected into recipe details
    // This tests the RecipeFork model associations directly
    const fork = await RecipeFork.findOne({
      where: { forkedByUserId: userId },
      include: [
        { model: Recipe, as: 'originalRecipe', attributes: ['id', 'title'] },
        { model: User, as: 'forkedBy', attributes: ['id', 'nickname', 'username'] }
      ]
    })
    expect(fork).not.toBeNull()
    expect(fork.originalRecipe).toBeDefined()
    expect(fork.forkedBy).toBeDefined()
    expect(fork.changesNote).toBeDefined()
  })
})