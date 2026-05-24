'use strict'

const { Sequelize, DataTypes } = require('sequelize')

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
})

// Define models matching production
const Collection = sequelize.define('Collection', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
  recipeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  coverImage: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'collections', timestamps: true })

const CollectionRecipe = sequelize.define('CollectionRecipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  collectionId: { type: DataTypes.STRING, allowNull: false },
  recipeId: { type: DataTypes.STRING, allowNull: false },
  note: { type: DataTypes.TEXT, allowNull: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'collection_recipes', timestamps: true })

const ShoppingList = sequelize.define('ShoppingList', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false, defaultValue: '购物清单' },
  items: { type: DataTypes.JSON, defaultValue: [] },
  isChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'shopping_lists', timestamps: true })

const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  ingredients: { type: DataTypes.JSON, defaultValue: [] },
  steps: { type: DataTypes.JSON, defaultValue: [] },
  userId: { type: DataTypes.STRING, allowNull: true },
  difficulty: { type: DataTypes.STRING, defaultValue: '中等' },
  cookTime: { type: DataTypes.INTEGER, defaultValue: 30 },
  image: { type: DataTypes.STRING, allowNull: true },
  nutrition: { type: DataTypes.JSON, allowNull: true },
  season: { type: DataTypes.STRING, allowNull: true },
  favoriteCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  commentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'recipes', timestamps: true })

describe('Collection Functions', () => {
  let collectionId

  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  beforeEach(async () => {
    await Collection.destroy({ where: {} })
    await CollectionRecipe.destroy({ where: {} })
  })

  it('创建收藏夹', async () => {
    const c = await Collection.create({ userId: 'u1', name: '我的最爱', description: '收藏好食谱', isPublic: true })
    expect(c.name).toBe('我的最爱')
    expect(c.isPublic).toBe(true)
    collectionId = c.id
  })

  it('创建私有收藏夹', async () => {
    const c = await Collection.create({ userId: 'u1', name: '私有', description: '仅自己可见' })
    expect(c.isPublic).toBe(false)
  })

  it('查询用户收藏夹列表', async () => {
    await Collection.create({ userId: 'u1', name: '收藏夹A' })
    await Collection.create({ userId: 'u1', name: '收藏夹B' })
    await Collection.create({ userId: 'u2', name: '其他人的' })
    const list = await Collection.findAll({ where: { userId: 'u1' } })
    expect(list).toHaveLength(2)
  })

  it('向收藏夹添加食谱', async () => {
    const c = await Collection.create({ userId: 'u1', name: '测试' })
    await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r1', note: '好吃', order: 1 })
    const items = await CollectionRecipe.findAll({ where: { collectionId: c.id } })
    expect(items).toHaveLength(1)
    expect(items[0].recipeId).toBe('r1')
  })

  it('向收藏夹添加多个食谱', async () => {
    const c = await Collection.create({ userId: 'u1', name: '多食谱' })
    await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r1', order: 1 })
    await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r2', order: 2 })
    await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r3', order: 3 })
    const items = await CollectionRecipe.findAll({ where: { collectionId: c.id } })
    expect(items).toHaveLength(3)
  })

  it('删除收藏夹中的食谱', async () => {
    const c = await Collection.create({ userId: 'u1', name: '删除测试' })
    const item = await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r1' })
    await CollectionRecipe.destroy({ where: { id: item.id } })
    const items = await CollectionRecipe.findAll({ where: { collectionId: c.id } })
    expect(items).toHaveLength(0)
  })

  it('删除收藏夹（级联需要手动）', async () => {
    const c = await Collection.create({ userId: 'u1', name: '待删除' })
    await CollectionRecipe.create({ collectionId: c.id, recipeId: 'r1' })
    await CollectionRecipe.destroy({ where: { collectionId: c.id } })
    await Collection.destroy({ where: { id: c.id } })
    const remaining = await Collection.findAll({ where: { id: c.id } })
    expect(remaining).toHaveLength(0)
  })

  it('更新收藏夹信息', async () => {
    const c = await Collection.create({ userId: 'u1', name: '旧名' })
    c.name = '新名'
    c.description = '更新描述'
    await c.save()
    const updated = await Collection.findByPk(c.id)
    expect(updated.name).toBe('新名')
    expect(updated.description).toBe('更新描述')
  })

  it('公开收藏夹能被查到', async () => {
    await Collection.create({ userId: 'u1', name: '公开', isPublic: true })
    await Collection.create({ userId: 'u1', name: '私有', isPublic: false })
    const publicOnes = await Collection.findAll({ where: { isPublic: true } })
    expect(publicOnes).toHaveLength(1)
  })

  it('recipeCount 可自增', async () => {
    const c = await Collection.create({ userId: 'u1', name: '计数测试' })
    c.recipeCount = c.recipeCount + 1
    await c.save()
    expect(c.recipeCount).toBe(1)
    c.recipeCount += 2
    await c.save()
    expect(c.recipeCount).toBe(3)
  })
})

describe('ShoppingList Functions', () => {
  beforeEach(async () => {
    await ShoppingList.destroy({ where: {} })
  })

  it('创建购物清单', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '买菜清单', items: [{ name: '番茄' }, { name: '鸡蛋' }] })
    expect(list.name).toBe('买菜清单')
    expect(list.items).toHaveLength(2)
  })

  it('默认名称', async () => {
    const list = await ShoppingList.create({ userId: 'u1', items: [] })
    expect(list.name).toBe('购物清单')
  })

  it('查询用户清单', async () => {
    await ShoppingList.create({ userId: 'u1', name: '清单A' })
    await ShoppingList.create({ userId: 'u1', name: '清单B' })
    await ShoppingList.create({ userId: 'u2', name: '别人的' })
    const lists = await ShoppingList.findAll({ where: { userId: 'u1' } })
    expect(lists).toHaveLength(2)
  })

  it('更新清单名称', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '旧' })
    list.name = '重命名'
    await list.save()
    expect(list.name).toBe('重命名')
  })

  it('添加购物项', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '购物', items: [{ name: '牛奶' }] })
    const items = [...list.items, { name: '面包' }]
    list.items = items
    await list.save()
    expect(list.items).toHaveLength(2)
  })

  it('删除购物项', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '购物', items: [{ name: '牛奶' }, { name: '面包' }, { name: '鸡蛋' }] })
    const filtered = list.items.filter((i) => i.name !== '面包')
    list.items = filtered
    await list.save()
    expect(list.items).toHaveLength(2)
    expect(list.items.map((i) => i.name)).not.toContain('面包')
  })

  it('清空购物清单', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '购物', items: [{ name: '牛奶' }, { name: '面包' }] })
    list.items = []
    await list.save()
    expect(list.items).toHaveLength(0)
  })

  it('删除购物清单', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '待删除', items: [] })
    await list.destroy()
    const remaining = await ShoppingList.findAll({ where: { userId: 'u1' } })
    expect(remaining).toHaveLength(0)
  })

  it('支持中文食材分类', async () => {
    const list = await ShoppingList.create({
      userId: 'u1',
      name: '分类测试',
      items: [
        { name: '五花肉', category: '肉类' },
        { name: '西兰花', category: '蔬菜' },
        { name: '苹果', category: '水果' },
      ],
    })
    const cats = [...new Set(list.items.map((i) => i.category))]
    expect(cats).toContain('肉类')
    expect(cats).toContain('蔬菜')
    expect(cats).toContain('水果')
  })
})

describe('Recipe Model Functions', () => {
  beforeEach(async () => {
    await Recipe.destroy({ where: {} })
  })

  it('创建简单食谱', async () => {
    const r = await Recipe.create({ title: '测试食谱', category: '中式', ingredients: [{ name: '盐' }], steps: [{ content: '放盐' }] })
    expect(r.title).toBe('测试食谱')
    expect(r.category).toBe('中式')
  })

  it('创建复杂食谱', async () => {
    const r = await Recipe.create({
      title: '复杂食谱', category: '西式',
      ingredients: [{ name: '面粉' }, { name: '鸡蛋' }, { name: '糖' }],
      steps: [{ content: '混合' }, { content: '烘烤' }, { content: '冷却' }],
      difficulty: '困难', cookTime: 90, nutrition: { calories: 500, protein: 8 },
    })
    expect(r.difficulty).toBe('困难')
    expect(r.cookTime).toBe(90)
    expect(r.nutrition.calories).toBe(500)
  })

  it('默认值为空数组', async () => {
    const r = await Recipe.create({ title: '最少字段', category: '甜品' })
    expect(r.ingredients).toEqual([])
    expect(r.steps).toEqual([])
    expect(r.favoriteCount).toBe(0)
    expect(r.commentCount).toBe(0)
  })

  it('按分类查询食谱', async () => {
    await Recipe.create({ title: '饺子', category: '中式' })
    await Recipe.create({ title: '牛排', category: '西式' })
    await Recipe.create({ title: '蛋糕', category: '甜品' })
    const chinese = await Recipe.findAll({ where: { category: '中式' } })
    expect(chinese).toHaveLength(1)
    expect(chinese[0].title).toBe('饺子')
  })

  it('更新烹饪次数', async () => {
    const r = await Recipe.create({ title: '统计测试', category: '中式' })
    r.viewCount = (r.viewCount || 0) + 1
    await r.save()
    expect(r.viewCount).toBe(1)
    r.viewCount += 5
    await r.save()
    expect(r.viewCount).toBe(6)
  })

  it('support season field', async () => {
    await Recipe.create({ title: '冬季汤', category: '中式', season: 'winter' })
    await Recipe.create({ title: '夏季沙拉', category: '西式', season: 'summer' })
    const winter = await Recipe.findAll({ where: { season: 'winter' } })
    expect(winter).toHaveLength(1)
    expect(winter[0].title).toBe('冬季汤')
  })

  it('删除食谱', async () => {
    const r = await Recipe.create({ title: '待删除', category: '中式' })
    await r.destroy()
    const remaining = await Recipe.findAll({ where: { title: '待删除' } })
    expect(remaining).toHaveLength(0)
  })

  it('多个食谱 favorited 正确', async () => {
    await Recipe.create({ title: 'A', category: '中式', favoriteCount: 10 })
    await Recipe.create({ title: 'B', category: '中式', favoriteCount: 5 })
    const all = await Recipe.findAll({ where: { category: '中式' }, order: [['favoriteCount', 'DESC']] })
    expect(all[0].title).toBe('A')
    expect(all[1].title).toBe('B')
  })
})

describe('数据完整性', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  it('批量创建并查询', async () => {
    const recipes = []
    for (let i = 0; i < 10; i++) {
      recipes.push(await Recipe.create({ title: `食谱${i}`, category: '中式' }))
    }
    const all = await Recipe.findAll()
    expect(all).toHaveLength(10)
  })

  it('不同用户的数据隔离', async () => {
    await Collection.create({ userId: 'u1', name: '用户1的' })
    await Collection.create({ userId: 'u2', name: '用户2的' })
    const u1 = await Collection.findAll({ where: { userId: 'u1' } })
    const u2 = await Collection.findAll({ where: { userId: 'u2' } })
    expect(u1).toHaveLength(1)
    expect(u2).toHaveLength(1)
  })

  it('UUID 自动生成', async () => {
    const r = await Recipe.create({ title: 'UUID测试', category: '中式' })
    expect(r.id).toBeDefined()
    expect(typeof r.id).toBe('string')
    expect(r.id.length).toBeGreaterThan(10)
  })

  it('timestamp 自动记录', async () => {
    const r = await Recipe.create({ title: '时间测试', category: '中式' })
    expect(r.createdAt).toBeDefined()
    expect(r.updatedAt).toBeDefined()
    const created = new Date(r.createdAt).getTime()
    expect(created).toBeGreaterThan(0)
  })

  it('字符串字段可空', async () => {
    const r = await Recipe.create({ title: '空字段测试', category: '中式', image: null, difficulty: null })
    expect(r.image).toBeNull()
    // difficulty has default value
    const found = await Recipe.findByPk(r.id)
    expect(found.title).toBe('空字段测试')
  })
})
describe('数据边界情况', () => {
  it('空字符串名称', async () => {
    const c = await Collection.create({ userId: 'u1', name: '' })
    expect(c.name).toBe('')
  })

  it('超长描述', async () => {
    const longDesc = 'x'.repeat(1000)
    const c = await Collection.create({ userId: 'u1', name: '长描述', description: longDesc })
    expect(c.description.length).toBe(1000)
  })

  it('空 JSON items', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: '空', items: [] })
    expect(list.items).toEqual([])
  })

  it('items 为 null 时使用默认值', async () => {
    const list = await ShoppingList.create({ userId: 'u1', name: 'null测试' })
    expect(list.items).toEqual([])
  })

  it('重复添加同一食谱到不同收藏夹', async () => {
    const c1 = await Collection.create({ userId: 'u1', name: 'A' })
    const c2 = await Collection.create({ userId: 'u1', name: 'B' })
    await CollectionRecipe.create({ collectionId: c1.id, recipeId: 'r1' })
    await CollectionRecipe.create({ collectionId: c2.id, recipeId: 'r1' })
    const items = await CollectionRecipe.findAll({ where: { recipeId: 'r1' } })
    expect(items).toHaveLength(2)
  })
})
