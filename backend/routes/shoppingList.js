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

module.exports = router