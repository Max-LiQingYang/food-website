'use strict'

/**
 * routes/shoppingList.js
 * 购物清单路由
 *
 * POST /generate — 根据食谱 IDs 生成购物清单（合并同名食材）
 * GET  /         — 获取当前用户的购物清单列表
 * PUT  /:id      — 更新购物清单 {name?, items?}
 *
 * 所有端点需要 JWT 认证。
 */

const express = require('express')
const { ShoppingList, Recipe } = require('../models')
const auth = require('../middleware/auth')

const router = express.Router()

/**
 * 通用响应封装
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 解析食谱 ingredients JSON 为数组
 */
function parseIngredients(recipe) {
  if (!recipe || !recipe.ingredients) return []
  // getter 已解析为数组，直接返回；否则 JSON.parse 字符串
  if (Array.isArray(recipe.ingredients)) return recipe.ingredients
  try {
    const parsed = JSON.parse(recipe.ingredients)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 合并多个食谱的食材列表
 * 同名食材合并 amount（数值相加），unit 取第一个非空值
 */
function mergeIngredients(ingredientLists) {
  const merged = {}

  for (const list of ingredientLists) {
    for (const item of list) {
      const name = (item.name || '').trim()
      if (!name) continue

      const amount = parseFloat(item.amount) || 0
      const unit = item.unit || ''

      if (merged[name]) {
        merged[name].amount += amount
        // 保留第一个非空单位
        if (!merged[name].unit && unit) {
          merged[name].unit = unit
        }
      } else {
        merged[name] = {
          name,
          amount,
          unit: unit || '',
          checked: false
        }
      }
    }
  }

  return Object.values(merged)
}

// ─────────────────────────────────────────────────────────────────
// POST /generate — 根据食谱 IDs 合并生成购物清单
// ─────────────────────────────────────────────────────────────────
router.post('/generate', auth, async (req, res) => {
  try {
    const { recipeIds } = req.body

    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '请提供至少一个食谱 ID', null))
    }

    // 查询所有食谱
    const recipes = await Recipe.findAll({
      where: { id: recipeIds },
      attributes: ['id', 'title', 'ingredients']
    })

    if (recipes.length === 0) {
      return res.status(404).json(resJSON(404, '未找到对应食谱', null))
    }

    // 解析并合并食材
    const ingredientLists = recipes.map(parseIngredients)
    const mergedItems = mergeIngredients(ingredientLists)

    if (mergedItems.length === 0) {
      return res.status(400).json(resJSON(400, '所选食谱没有食材数据', null))
    }

    // 获取用户最近的购物清单
    const recentList = await ShoppingList.findOne({
      where: { userId: req.userId },
      order: [['updatedAt', 'DESC']]
    })

    let shoppingList
    const recipeTitles = recipes.map(r => r.title).join('、')

    if (recentList) {
      // 追加到最近的清单：合并现有 items 和新 items
      let existingItems = []
      try {
        existingItems = JSON.parse(recentList.items || '[]')
      } catch {
        existingItems = []
      }

      // 以新食材为主，与已有食材合并
      const existingMap = {}
      for (const item of existingItems) {
        existingMap[item.name] = item
      }

      for (const newItem of mergedItems) {
        if (existingMap[newItem.name]) {
          existingMap[newItem.name].amount += newItem.amount
          if (!existingMap[newItem.name].unit && newItem.unit) {
            existingMap[newItem.name].unit = newItem.unit
          }
        } else {
          existingMap[newItem.name] = newItem
        }
      }

      const finalItems = Object.values(existingMap)

      await recentList.update({
        items: JSON.stringify(finalItems),
        name: `${recentList.name} + ${recipeTitles}`
      })
      shoppingList = recentList
    } else {
      // 新建清单
      shoppingList = await ShoppingList.create({
        userId: req.userId,
        name: `${recipeTitles} 的购物清单`,
        items: JSON.stringify(mergedItems)
      })
    }

    const data = shoppingList.toJSON()
    try {
      data.items = JSON.parse(data.items)
    } catch {
      data.items = []
    }
    data.sourceRecipeIds = recipeIds

    return res.status(201).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[POST /shopping-list/generate] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET / — 获取当前用户的购物清单列表
// ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const lists = await ShoppingList.findAll({
      where: { userId: req.userId },
      order: [['updatedAt', 'DESC']]
    })

    const result = lists.map(l => {
      const data = l.toJSON()
      try {
        data.items = JSON.parse(data.items || '[]')
      } catch {
        data.items = []
      }
      return data
    })

    return res.status(200).json(resJSON(0, 'ok', result))
  } catch (err) {
    console.error('[GET /shopping-list] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// PUT /:id — 更新购物清单 {name?, items?}
// ─────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const list = await ShoppingList.findOne({
      where: { id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    const { name, items } = req.body
    const updateData = {}

    if (name !== undefined) updateData.name = String(name).trim()
    if (items !== undefined) updateData.items = typeof items === 'string' ? items : JSON.stringify(items)

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json(resJSON(400, '没有需要更新的字段', null))
    }

    await list.update(updateData)

    const data = list.toJSON()
    try {
      data.items = JSON.parse(data.items || '[]')
    } catch {
      data.items = []
    }

    return res.status(200).json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[PUT /shopping-list/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id — 删除购物清单
// ─────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params
    const list = await ShoppingList.findOne({
      where: { id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    await list.destroy()

    return res.status(200).json(resJSON(0, '删除成功', null))
  } catch (err) {
    console.error('[DELETE /shopping-list/:id] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// POST /:id/items — 向清单添加多个项目
// ─────────────────────────────────────────────────────────────────
router.post('/:id/items', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { items } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(resJSON(400, '请提供要添加的项目', null))
    }

    const list = await ShoppingList.findOne({
      where: { id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    let existingItems = []
    try {
      existingItems = JSON.parse(list.items || '[]')
    } catch {
      existingItems = []
    }

    const existingMap = {}
    for (const item of existingItems) {
      existingMap[item.name] = item
    }

    for (const newItem of items) {
      const name = (newItem.name || '').trim()
      if (!name) continue
      if (existingMap[name]) {
        existingMap[name].amount += parseFloat(newItem.amount) || 0
        if (!existingMap[name].unit && newItem.unit) {
          existingMap[name].unit = newItem.unit
        }
      } else {
        existingMap[name] = {
          name,
          amount: parseFloat(newItem.amount) || 0,
          unit: newItem.unit || '',
          checked: false
        }
      }
    }

    const finalItems = Object.values(existingMap)
    await list.update({ items: JSON.stringify(finalItems) })

    const data = list.toJSON()
    try {
      data.items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items
    } catch {
      data.items = []
    }

    return res.status(200).json(resJSON(0, '已添加', data))
  } catch (err) {
    console.error('[POST /shopping-list/:id/items] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// DELETE /:id/items/:itemName — 从清单删除一个项目
// ─────────────────────────────────────────────────────────────────
router.delete('/:id/items/:itemName', auth, async (req, res) => {
  try {
    const { id, itemName } = req.params

    const list = await ShoppingList.findOne({
      where: { id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    let items = []
    try {
      items = JSON.parse(list.items || '[]')
    } catch {
      items = []
    }

    const decodedName = decodeURIComponent(itemName)
    const filtered = items.filter((i) => i.name !== decodedName)

    if (filtered.length === items.length) {
      return res.status(404).json(resJSON(404, '未找到该项目', null))
    }

    await list.update({ items: JSON.stringify(filtered) })

    const data = list.toJSON()
    data.items = filtered

    return res.status(200).json(resJSON(0, '已删除项目', data))
  } catch (err) {
    console.error('[DELETE /shopping-list/:id/items/:itemName] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// 食材类别分组映射
// ─────────────────────────────────────────────────────────────────
const INGREDIENT_GROUPS = {
  '🥩 肉类': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸭肉', '五花肉', '里脊', '排骨', '鸡胸肉', '鸡腿', '牛腩', '牛腱', '肉末', '腊肉', '培根', '火腿', '香肠'],
  '🐟 水产': ['鱼', '虾', '蟹', '鱿鱼', '蛤蜊', '虾仁', '三文鱼', '鲈鱼', '带鱼', '龙利鱼', '鳕鱼', '贝'],
  '🥚 蛋豆制品': ['鸡蛋', '鸭蛋', '豆腐', '豆腐干', '千张', '腐竹', '豆皮', '豆浆', '毛豆', '黄豆', '豆豉'],
  '🥬 蔬菜': ['白菜', '菠菜', '生菜', '油菜', '空心菜', '苋菜', '韭菜', '卷心菜', '羽衣甘蓝', '土豆', '胡萝卜', '萝卜', '红薯', '山药', '芋头', '莲藕', '竹笋', '莴笋', '番茄', '茄子', '青椒', '甜椒', '黄瓜', '冬瓜', '南瓜', '丝瓜', '苦瓜', '西葫芦', '秋葵', '香菇', '蘑菇', '金针菇', '杏鲍菇', '木耳', '银耳', '平菇', '茶树菇', '豆芽', '蒜苗', '芹菜', '西兰花', '花菜', '洋葱', '玉米', '豌豆', '葱', '姜', '蒜'],
  '🍎 水果': ['苹果', '香蕉', '橙子', '柠檬', '西瓜', '芒果', '草莓', '蓝莓', '葡萄', '桃子', '梨', '猕猴桃', '火龙果', '百香果', '菠萝', '椰子', '红枣', '枸杞', '桂圆', '葡萄干'],
  '🌾 主食': ['大米', '糯米', '面粉', '面条', '米粉', '意面', '面包', '馒头', '饺子皮', '馄饨皮', '年糕', '燕麦', '小米', '玉米面'],
  '🥛 奶制品': ['牛奶', '酸奶', '黄油', '奶油', '奶酪', '芝士', '炼乳', '淡奶油'],
  '🧂 调味料': ['盐', '糖', '生抽', '老抽', '酱油', '醋', '料酒', '蚝油', '豆瓣酱', '番茄酱', '辣椒酱', '甜面酱', '芝麻酱', '腐乳', '蜂蜜', '花椒', '八角', '桂皮', '香叶', '干辣椒', '胡椒粉', '五香粉', '孜然', '淀粉', '泡打粉', '小苏打', '味精', '鸡精'],
  '🥜 干货果仁': ['花生', '核桃', '杏仁', '腰果', '松子', '芝麻', '枸杞', '红枣', '桂圆', '葡萄干'],
  '🫒 油脂': ['食用油', '花生油', '橄榄油', '芝麻油', '猪油', '黄油', '植物油'],
  '📦 其他': [],
}

/**
 * 根据食材名返回类别分组
 */
function getIngredientGroup(name) {
  if (!name) return '📦 其他'
  const lower = name.toLowerCase()
  for (const [group, items] of Object.entries(INGREDIENT_GROUPS)) {
    if (items.some(i => lower.includes(i.toLowerCase()) || i.toLowerCase().includes(lower))) {
      return group
    }
  }
  return '📦 其他'
}

/**
 * 食材价格估算（每单位元）
 */
const PRICE_ESTIMATES = {
  '猪肉': 30, '牛肉': 60, '羊肉': 70, '鸡肉': 25, '鸭肉': 28,
  '排骨': 55, '鸡胸肉': 20, '鸡腿': 18, '五花肉': 35, '牛腩': 50,
  '鸡蛋': 1.5, '豆腐': 3, '豆腐干': 5,
  '白菜': 3, '菠菜': 5, '生菜': 4, '油菜': 4, '番茄': 6, '黄瓜': 4,
  '土豆': 3, '胡萝卜': 4, '洋葱': 4, '青椒': 6, '茄子': 5,
  '大米': 5, '面条': 4, '面粉': 4, '面包': 8,
  '牛奶': 8, '酸奶': 6, '黄油': 25, '奶油': 20, '芝士': 30,
  '生抽': 8, '老抽': 8, '醋': 6, '料酒': 5, '盐': 3, '糖': 5,
  '食用油': 15, '橄榄油': 40, '芝麻油': 20,
}

/**
 * 价格单位映射
 */
const PRICE_UNITS = {
  '个': 1, '颗': 1, '枚': 1, '只': 1, '包': 5, '袋': 5, '盒': 10, '瓶': 15, '罐': 8,
}

function estimateItemPrice(name, amount = 0, unit = '') {
  const basePrice = PRICE_ESTIMATES[name] || null
  if (basePrice === null) return null

  const unitMultiplier = PRICE_UNITS[unit] || 1
  const perUnitPrice = unit === '克' || unit === 'g' || unit === 'ml' ? basePrice / 500 : basePrice
  return Math.round(amount * perUnitPrice * unitMultiplier * 100) / 100
}

/**
 * 为购物清单 items 添加分组和价格估算
 */
function enrichItems(items) {
  const enriched = items.map(item => ({
    ...item,
    group: getIngredientGroup(item.name || ''),
    estimatedPrice: estimateItemPrice(item.name, parseFloat(item.amount) || 0, item.unit || ''),
  }))

  // 按组别排序
  const sorted = enriched.sort((a, b) => {
    if (a.group < b.group) return -1
    if (a.group > b.group) return 1
    return a.name.localeCompare(b.name, 'zh')
  })

  return sorted
}

// ─────────────────────────────────────────────────────────────────
// GET /:id/enriched — 获取增强版购物清单（含分组 + 价格估算）
// ─────────────────────────────────────────────────────────────────
router.get('/:id/enriched', auth, async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    let items = []
    try { items = JSON.parse(list.items || '[]') } catch { items = [] }

    const enriched = enrichItems(items)
    const totalEstimate = enriched.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0)

    // 按分组建结构
    const byGroup = {}
    for (const item of enriched) {
      if (!byGroup[item.group]) byGroup[item.group] = []
      byGroup[item.group].push(item)
    }

    const data = list.toJSON()
    data.items = enriched
    data.itemsByGroup = byGroup
    data.totalEstimate = Math.round(totalEstimate * 100) / 100

    return res.json(resJSON(0, 'ok', data))
  } catch (err) {
    console.error('[GET /shopping-list/:id/enriched] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

// ─────────────────────────────────────────────────────────────────
// GET /:id/copy-text — 获取复制文本
// ─────────────────────────────────────────────────────────────────
router.get('/:id/copy-text', auth, async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      where: { id: req.params.id, userId: req.userId }
    })

    if (!list) {
      return res.status(404).json(resJSON(404, '购物清单不存在', null))
    }

    let items = []
    try { items = JSON.parse(list.items || '[]') } catch { items = [] }

    const enriched = enrichItems(items)
    const totalEstimate = enriched.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0)

    // 按分组构建文本
    const byGroup = {}
    for (const item of enriched) {
      if (!byGroup[item.group]) byGroup[item.group] = []
      byGroup[item.group].push(item)
    }

    const lines = [
      `🛒 购物清单: ${list.name}`,
      `━━━━━━━━━━━━━━━━━━━━`,
    ]

    for (const [group, groupItems] of Object.entries(byGroup)) {
      lines.push(`\n${group}:`)
      for (const item of groupItems) {
        const amount = item.amount || 0
        const unit = item.unit || ''
        const priceStr = item.estimatedPrice != null ? ` ¥${item.estimatedPrice.toFixed(1)}` : ''
        const checked = item.checked ? '✅' : '⬜'
        if (amount > 0 && unit) {
          lines.push(`  ${checked} ${item.name} × ${amount}${unit}${priceStr}`)
        } else if (amount > 0) {
          lines.push(`  ${checked} ${item.name} × ${amount}${priceStr}`)
        } else {
          lines.push(`  ${checked} ${item.name}${priceStr}`)
        }
      }
    }

    if (totalEstimate > 0) {
      lines.push(`\n━━━━━━━━━━━━━━━━━━━━`)
      lines.push(`💰 预估总计: ¥${totalEstimate.toFixed(2)}`)
    }

    return res.json(resJSON(0, 'ok', {
      text: lines.join('\n'),
      name: list.name,
      totalEstimate: Math.round(totalEstimate * 100) / 100,
    }))
  } catch (err) {
    console.error('[GET /shopping-list/:id/copy-text] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})


// ─────────────────────────────────────────────────────────────────
// POST /batch-add — 批量添加多个食谱的食材到购物清单
// ─────────────────────────────────────────────────────────────────
router.post('/batch-add', auth, async (req, res) => {
  try {
    const userId = req.userId
    const { recipeIds } = req.body

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '请提供食谱ID列表', null))
    }

    // 获取所有食谱的食材
    const recipes = await Recipe.findAll({
      where: { id: recipeIds },
      attributes: ['id', 'title', 'ingredients']
    })

    const ingredientLists = recipes.map(parseIngredients)
    const mergedItems = mergeIngredients(ingredientLists)

    if (mergedItems.length === 0) {
      return res.status(400).json(resJSON(400, '没有可添加的食材', null))
    }

    // 查找或创建今日购物清单
    const today = new Date().toISOString().split('T')[0]
    let list = await ShoppingList.findOne({
      where: {
        userId,
        createdAt: {
          [require('sequelize').Op.gte]: new Date(today)
        }
      },
      order: [['createdAt', 'DESC']]
    })

    if (list) {
      // 合并到已有清单
      const existingItems = (() => {
        try { return JSON.parse(list.items) || [] } catch { return [] }
      })()
      const merged = {}
      for (const item of existingItems) {
        const name = (item.name || '').trim()
        if (name) merged[name] = { ...item }
      }
      for (const item of mergedItems) {
        const name = (item.name || '').trim()
        if (merged[name]) {
          merged[name].amount += item.amount
          if (!merged[name].unit && item.unit) merged[name].unit = item.unit
        } else {
          merged[name] = { ...item }
        }
      }
      list.items = JSON.stringify(Object.values(merged))
      await list.save()
    } else {
      const recipeTitles = recipes.map(r => r.title).join('、')
      list = await ShoppingList.create({
        userId,
        name: recipeTitles.length > 30 ? recipeTitles.slice(0, 30) + '…' : recipeTitles,
        items: JSON.stringify(mergedItems)
      })
    }

    return res.status(200).json(resJSON(0, 'success', {
      listId: list.id,
      name: list.name,
      items: mergedItems,
      added: mergedItems.length
    }))
  } catch (err) {
    console.error('[POST /shopping-list/batch-add] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})


// ─────────────────────────────────────────────────────────────────
// POST /batch — 批量将食谱食材添加到购物清单
// ─────────────────────────────────────────────────────────────────
router.post('/batch', auth, async (req, res) => {
  try {
    const userId = req.userId
    const { recipeIds } = req.body

    if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json(resJSON(400, '请提供食谱IDs', null))
    }

    // Get recipes with ingredients
    const recipes = await Recipe.findAll({
      where: { id: { [Op.in]: recipeIds } },
      attributes: ['id', 'title', 'ingredients']
    })

    // Merge all ingredients
    const allItems = []
    for (const recipe of recipes) {
      const ings = typeof recipe.ingredients === 'string'
        ? JSON.parse(recipe.ingredients)
        : (recipe.ingredients || [])
      ings.forEach(ing => {
        allItems.push({
          name: ing.name || ing,
          amount: parseFloat(ing.amount) || 0,
          unit: ing.unit || ''
        })
      })
    }

    // Find or create default shopping list
    let list = await ShoppingList.findOne({
      where: { userId, name: '批量添加' }
    })

    const mergedItems = mergeIngredients(allItems)

    if (list) {
      const existingItems = typeof list.items === 'string'
        ? JSON.parse(list.items)
        : (list.items || [])

      // Merge existing items with new items
      const allMerged = [...existingItems]
      for (const item of mergedItems) {
        const existing = allMerged.find(e => e.name === item.name)
        if (existing) {
          existing.amount = parseFloat(existing.amount || 0) + item.amount
          if (!existing.unit && item.unit) existing.unit = item.unit
        } else {
          allMerged.push(item)
        }
      }
      list.items = allMerged
      await list.save()
    } else {
      list = await ShoppingList.create({
        userId,
        name: '批量添加',
        items: mergedItems
      })
    }

    return res.status(200).json(resJSON(0, 'success', {
      added: mergedItems.length,
      items: mergedItems,
      listId: list.id
    }))
  } catch (err) {
    console.error('[POST /shopping-list/batch] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router