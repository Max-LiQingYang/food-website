'use strict'

/**
 * routes/ingredientSearch.js
 * 智能食材搜索 — POST /recipes/by-ingredients
 * 手头食材匹配推荐 + 缺少食材提示 + 别名展开 + AI 推荐 fallback
 */

const express = require('express')
const router = express.Router()
const { Op } = require('sequelize')
const { Recipe } = require('../models')
const { expandIngredients, getHotIngredients, ALIAS_TO_CANONICAL } = require('../utils/ingredientAliases')

// 通过手头食材搜索匹配食谱
router.post('/recipes/by-ingredients', async (req, res) => {
  try {
    const { ingredients = [], page = '1', pageSize = '20', strictMode = false } = req.body

    if (!ingredients.length) {
      return res.status(400).json({ code: 400, message: '请提供至少一种食材' })
    }

    // ── 别名展开 ──
    const expandedIngredients = expandIngredients(ingredients)
    const originalInput = ingredients.map(i => i.trim().toLowerCase())

    // ── 构建搜索条件 ──
    // 使用别名展开后的列表进行 OR 匹配（只要食材字段包含任意别名即匹配）
    const ingredientsWhere = {
      [Op.and]: originalInput.map(orig => ({
        ingredients: {
          [Op.like]: `%${orig}%`,
        },
      })),
    }

    // 对于严格模式，只使用完全扩展搜索
    // 对于非严格模式，使用 OR 匹配提高召回率
    if (!strictMode) {
      // 使用别名展开的食材做 OR 匹配
      const aliasConditions = expandedIngredients.map(alias => ({
        ingredients: { [Op.like]: `%${alias}%` },
      }))

      // 把 AND 条件改为：用户输入的所有原始食材都要出现（通过别名展开），用 OR 匹配每个别名
      ingredientsWhere[Op.and] = originalInput.map(orig => {
        // 找到该食材的所有别名（通过别名组）
        const lowerOrig = orig.toLowerCase()
        const canonical = ALIAS_TO_CANONICAL[lowerOrig]
        let relatedAliases
        if (canonical) {
          const { CANONICAL_TO_ALIASES } = require('../utils/ingredientAliases')
          relatedAliases = CANONICAL_TO_ALIASES[canonical].map(n => n.toLowerCase())
        } else {
          relatedAliases = [lowerOrig]
        }
        return {
          [Op.or]: relatedAliases.map(a => ({
            ingredients: { [Op.like]: `%${a}%` },
          })),
        }
      })

    }

    const offsetVal = (parseInt(page) - 1) * parseInt(pageSize)
    const limitVal = parseInt(pageSize)
    const { count, rows } = await Recipe.findAndCountAll({
      where: ingredientsWhere,
      limit: limitVal,
      offset: offsetVal,
      attributes: ['id', 'title', 'coverImage', 'description', 'category', 'difficulty', 'cookTime', 'servings', 'ingredients', 'favoriteCount', 'nutrition'],
    })

    // ── 计算匹配度 ──
    const result = rows.map(recipe => {
      let recipeIngredients = []
      try {
        const parsed = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients
        recipeIngredients = Array.isArray(parsed) ? parsed.map((i) => typeof i === 'string' ? i : (i.name || '')).filter(Boolean) : []
      } catch (e) { recipeIngredients = [] }

      // 使用别名扩展匹配
      const userLowerExpanded = expandedIngredients

      const matchedIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return userLowerExpanded.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })

      const missingIngredients = recipeIngredients.filter(ri => {
        const riLower = ri.toLowerCase()
        return !userLowerExpanded.some(ui => riLower.includes(ui) || ui.includes(riLower))
      })

      const matchRatio = recipeIngredients.length > 0
        ? Math.round((matchedIngredients.length / recipeIngredients.length) * 100)
        : 0

      return {
        ...recipe.toJSON(),
        matchRatio,
        matchedIngredients: matchedIngredients.slice(0, 5),
        missingIngredients: missingIngredients.slice(0, 10),
        matchCount: matchedIngredients.length,
        totalIngredients: recipeIngredients.length,
        // 提示别名匹配
        aliasExpanded: expandedIngredients.length > originalInput.length,
      }
    })

    // 按匹配度降序排序
    result.sort((a, b) => b.matchRatio - a.matchRatio)

    // ── AI fallback：无匹配时调用 AI 生成推荐 ──
    let aiRecipes = null
    let aiGenerated = false

    if (count === 0 && process.env.AI_API_KEY && process.env.NODE_ENV !== 'test') {
      try {
        const ingredientStr = ingredients.join('、')
        const aiPrompt = `你是一个美食食谱推荐专家。用户提供了以下食材：${ingredientStr}。请推荐 3 道包含这些食材的菜谱，每道菜谱包含：菜名、简介、所需食材列表、烹饪时长（分钟）、难度（easy/medium/hard）、份数。以 JSON 数组格式返回，每个元素包含 title, description, ingredients(数组[{name, amount, unit}]), cookTime, difficulty, servings 字段。只返回 JSON，不要其他文字。`

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        const aiRes = await fetch(
          `${process.env.AI_API_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.AI_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.AI_MODEL || 'deepseek-v3.2',
              messages: [{ role: 'user', content: aiPrompt }],
              temperature: 0.7,
            }),
            signal: controller.signal,
          }
        )

        clearTimeout(timeout)

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          let content = aiData.choices?.[0]?.message?.content || ''

          // 清理 markdown 代码块包裹
          content = content.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim()

          // ── 尝试解析 JSON ──
          // 1. 优先直接解析完整内容（AI 严格按提示返回 JSON 时）
          try {
            const full = JSON.parse(content)
            if (Array.isArray(full)) {
              aiRecipes = full
              aiGenerated = true
            }
          } catch (e) {
            // 完整解析失败，继续尝试
          }

          // 2. 用 bracket 计数精确提取 JSON 数组（避免 lazy regex 匹配到内层括号）
          if (!aiGenerated) {
            const startIdx = content.indexOf('[')
            if (startIdx !== -1) {
              let depth = 0
              let endIdx = -1
              for (let i = startIdx; i < content.length; i++) {
                if (content[i] === '[') depth++
                else if (content[i] === ']') {
                  depth--
                  if (depth === 0) { endIdx = i + 1; break }
                }
              }
              if (endIdx !== -1) {
                try {
                  aiRecipes = JSON.parse(content.slice(startIdx, endIdx))
                  aiGenerated = true
                } catch (e2) {}
              }
            }
          }

          // 3. 备用：提取单个 JSON 对象
          if (!aiGenerated) {
            const objStart = content.indexOf('{')
            if (objStart !== -1) {
              let depth = 0
              let endIdx = -1
              for (let i = objStart; i < content.length; i++) {
                if (content[i] === '{') depth++
                else if (content[i] === '}') {
                  depth--
                  if (depth === 0) { endIdx = i + 1; break }
                }
              }
              if (endIdx !== -1) {
                try {
                  const single = JSON.parse(content.slice(objStart, endIdx))
                  if (single.title) {
                    aiRecipes = [single]
                    aiGenerated = true
                  }
                } catch (e3) {}
              }
            }
          }

          if (!aiGenerated) {
            console.warn('[by-ingredients] AI response unparseable, first 400:', content.substring(0, 400))
          } else {
            console.log('[by-ingredients] AI fallback generated', aiRecipes.length, 'recipes')
          }
        } else {
          const aiErrBody = await aiRes.text().catch(() => 'unreadable')
          console.warn('[by-ingredients] AI API non-OK:', aiRes.status, aiErrBody.substring(0, 200))
        }
      } catch (aiErr) {
        if (aiErr.name === 'AbortError') {
          console.error('[by-ingredients] AI fallback timed out after 30s')
        } else {
          console.error('[by-ingredients] AI fallback failed:', aiErr.message)
        }
        // AI 失败不影响主流程
      }
    }

    res.json({
      code: 0,
      data: {
        list: result,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        userIngredients: ingredients,
        aliasExpanded: expandedIngredients,
        aiRecommends: aiRecipes,
        aiGenerated,
      },
    })
  } catch (err) {
    console.error('[POST /by-ingredients] error:', err.message)
    res.status(500).json({ code: 500, message: '食材搜索失败' })
  }
})

module.exports = router

// ── 辅助函数 ──

/**
 * 判断两个名称是否存在别名关系
 */
function areAliasRelated(a, b) {
  const { ALIAS_TO_CANONICAL } = require('../utils/ingredientAliases')
  const aCanon = ALIAS_TO_CANONICAL[a]
  const bCanon = ALIAS_TO_CANONICAL[b]
  return aCanon && bCanon && aCanon === bCanon
}