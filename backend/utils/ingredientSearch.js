'use strict'

/**
 * utils/ingredientSearch.js
 * 智能食材匹配搜索引擎
 *
 * 特性：
 * - 别名感知匹配（通过 ingredientAliases）
 * - 部分匹配模式（输入 N 种食材匹配任意 M 种即可）
 * - 匹配度加权排序
 * - AI 降级增强（无结果时调用 LLM）
 */

const { Op } = require('sequelize')
const { Recipe } = require('../models')
const { matchIngredient, expandSearchTerms } = require('./ingredientAliases')

// 列表查询的公共属性（不含 ingredients/steps，节省带宽）
const LIST_ATTRIBUTES = [
  'id', 'title', 'coverImage', 'author', 'cookTime',
  'description', 'category', 'categoryTags', 'difficulty',
  'season', 'servings', 'userId', 'createdAt', 'viewCount',
  'favoriteCount', 'commentCount',
]

/**
 * 计算需要匹配的最少食材数
 * @param {number} total - 用户输入的食材总数
 * @param {boolean} strict - 是否为严格模式
 * @returns {number} 最少匹配数
 */
function getMinMatch(total, strict) {
  if (strict) return total
  if (total <= 2) return total
  if (total === 3) return 2
  if (total === 4) return 3
  return Math.ceil(total * 0.6)
}

/**
 * 按食材搜索食谱（主要搜索函数）
 * @param {Object} options
 * @param {string[]} options.ingredients - 用户输入的食材列表
 * @param {string} [options.exclude] - 要排除的食材
 * @param {boolean} [options.strict] - 严格模式（默认 false）
 * @param {Object} [options.models] - 可选，传入 models 覆盖引用
 * @returns {Promise<Object>} { list: Recipe[], searchInfo: { totalInput, minMatch, matchedIds } }
 */
async function searchByIngredients(options) {
  const { ingredients, exclude, strict = false } = options
  const RecipeModel = (options.models && options.models.Recipe) || Recipe

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return { list: [], searchInfo: { totalInput: 0, minMatch: 0, matchedIds: [] } }
  }

  const inputList = ingredients
    .map(s => String(s).trim())
    .filter(Boolean)

  if (inputList.length === 0) {
    return { list: [], searchInfo: { totalInput: 0, minMatch: 0, matchedIds: [] } }
  }

  const minMatch = getMinMatch(inputList.length, strict)

  // 展开别名后的搜索词列表（用于 DB 模糊匹配）
  const expandedTerms = expandSearchTerms(inputList)

  // 构建 DB 级 where 条件（OR 逻辑：匹配任一词的食谱都会被召回）
  const where = {
    [Op.or]: expandedTerms.map(term => ({
      ingredients: { [Op.like]: `%${term}%` },
    })),
  }

  // 食材排除
  if (exclude) {
    const excludeList = String(exclude)
      .split(/[,，、\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
    if (excludeList.length > 0) {
      const excludeCond = excludeList.map(name => ({
        ingredients: { [Op.notLike]: `%${name}%` },
      }))
      where[Op.and] = [...(where[Op.and] || []), ...excludeCond]
    }
  }

  // 1. DB 模糊查询（OR 逻辑，提高召回率）
  const dbRecipes = await RecipeModel.findAll({
    where,
    attributes: LIST_ATTRIBUTES.concat(['ingredients']),
  })

  // 2. 用别名感知匹配器精确计算匹配度
  const results = dbRecipes.map(recipe => {
    const data = recipe.toJSON()
    let recipeIngredientNames = []
    if (data.ingredients) {
      try {
        const parsed = JSON.parse(data.ingredients)
        recipeIngredientNames = (Array.isArray(parsed) ? parsed : []).map(i => i.name)
      } catch {
        recipeIngredientNames = [String(data.ingredients)]
      }
    }

    // 用别名感知匹配器做精确匹配
    let matchedCount = 0
    const matchedNames = []
    const unmatchedNames = []

    for (const input of inputList) {
      const result = matchIngredient(input, recipeIngredientNames)
      if (result.matched) {
        matchedCount++
        matchedNames.push(input)
      } else {
        unmatchedNames.push(input)
      }
    }

    const matchScore = Math.round((matchedCount / inputList.length) * 100)

    return {
      id: data.id,
      title: data.title,
      coverImage: data.coverImage,
      author: data.author,
      cookTime: data.cookTime,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      servings: data.servings,
      userId: data.userId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      viewCount: data.viewCount || 0,
      favoriteCount: data.favoriteCount || 0,
      commentCount: data.commentCount || 0,
      matchScore,
      matchedIngredients: matchedNames,
      unmatchedIngredients: unmatchedNames,
      totalIngredients: recipeIngredientNames.length,
      recommendType: 'ingredient',
    }
  })

  // 3. 过滤：只保留达到最低匹配数的食谱
  let filtered = results.filter(r => r.matchedCount >= minMatch)

  // 如果没有食谱达到最低匹配，放宽到至少匹配1种
  if (filtered.length === 0) {
    filtered = results.filter(r => r.matchedCount >= 1)
  }

  // 4. 排序：匹配度降序 → 同分时按热力度降序
  filtered.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    // 同分时：favoriteCount/viewCount 降序
    const hotA = (a.favoriteCount || 0) * 2 + (a.viewCount || 0)
    const hotB = (b.favoriteCount || 0) * 2 + (b.viewCount || 0)
    return hotB - hotA
  })

  return {
    list: filtered,
    searchInfo: {
      totalInput: inputList.length,
      minMatch,
      matchedIds: filtered.map(r => r.id),
    },
  }
}

/**
 * AI 降级增强：当 DB 匹配不到结果时，调用 LLM 生成推荐
 * @param {string[]} ingredientList
 * @param {Object} [options]
 * @param {string} [options.apiKey]
 * @param {string} [options.apiBaseUrl]
 * @param {string} [options.model]
 * @returns {Promise<Object|null>}
 */
async function aiFallbackSearch(ingredientList, options = {}) {
  const { apiKey = process.env.AI_API_KEY, apiBaseUrl = process.env.AI_API_BASE_URL, model = process.env.AI_MODEL } = options

  if (!apiKey || process.env.NODE_ENV === 'test') return null

  const ingredientStr = ingredientList.join('、')
  const aiPrompt = `你是一个美食食谱推荐专家。用户提供了以下食材：${ingredientStr}。请推荐 3 道包含这些食材的菜谱，每道菜谱包含：菜名、简介、所需食材列表（从用户食材中选取）、烹饪时长（分钟）、难度（easy/medium/hard）、份数。以 JSON 数组格式返回，每个元素包含 title, description, ingredients(数组[{name, amount, unit}]), cookTime, difficulty, servings 字段。只返回 JSON，不要其他文字。`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const aiRes = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'deepseek-v3.2',
        messages: [{ role: 'user', content: aiPrompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!aiRes.ok) {
      console.warn(`[ingredientSearch] AI API error: ${aiRes.status}`)
      return null
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content || ''

    // 用括号计数法解析 JSON（避免 markdown 代码块的干扰）
    const jsonStart = content.indexOf('[')
    const jsonEnd = content.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1) return null

    const jsonStr = content.slice(jsonStart, jsonEnd + 1)
    const aiRecipes = JSON.parse(jsonStr)

    if (!Array.isArray(aiRecipes) || aiRecipes.length === 0) return null

    return {
      aiRecommends: aiRecipes.map((r, i) => ({
        id: `ai-${i + 1}`,
        title: r.title || '',
        description: r.description || '',
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        cookTime: r.cookTime || 30,
        difficulty: r.difficulty || 'medium',
        servings: r.servings || 2,
      })),
      aiGenerated: true,
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[ingredientSearch] AI API timeout')
    } else {
      console.warn(`[ingredientSearch] AI API error: ${err.message}`)
    }
    return null
  }
}

module.exports = {
  searchByIngredients,
  aiFallbackSearch,
  getMinMatch,
  LIST_ATTRIBUTES,
}