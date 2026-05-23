'use strict'

/**
 * routes/import.js
 * 食谱导入路由 — 从 URL 解析 Schema.org Recipe 结构化数据
 *
 * POST /api/recipes/import
 */

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

/**
 * 通用响应封装
 */
function resJSON(code, message, data) {
  return { code, message, data }
}

/**
 * 从字符串中提取数字（用于营养价值解析）
 */
function extractNum(str) {
  if (!str) return 0
  return parseFloat(String(str).replace(/[^0-9.]/g, '')) || 0
}

// ─────────────────────────────────────────────────────────────────
// POST /import — 从 URL 导入食谱
// ─────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { url: targetUrl } = req.body

    if (!targetUrl || typeof targetUrl !== 'string') {
      return res.status(400).json(resJSON(400, '请提供有效的 URL', null))
    }

    // 校验 URL 格式
    try {
      new URL(targetUrl)
    } catch {
      return res.status(400).json(resJSON(400, 'URL 格式无效', null))
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      return res.status(400).json(resJSON(400, '只支持 http/https 协议', null))
    }

    // 抓取页面（内置 Node fetch，超时 15s）
    let html
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const resp = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FoodWebsite/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      })
      clearTimeout(timeoutId)
      if (!resp.ok) {
        return res.status(422).json(resJSON(422, '无法访问页面 (HTTP ' + resp.status + ')', null))
      }
      html = await resp.text()
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(408).json(resJSON(408, '请求超时，请检查 URL', null))
      }
      console.error('[import] Fetch error:', fetchErr.message)
      return res.status(502).json(resJSON(502, '无法获取页面内容', null))
    }

    if (!html || html.length < 100) {
      return res.status(422).json(resJSON(422, '页面内容为空或过短', null))
    }

    // 解析 HTML
    const cheerio = require('cheerio')
    const $ = cheerio.load(html)

    const parsed = {
      title: '',
      description: '',
      coverImage: '',
      cookTime: 0,
      servings: 0,
      difficulty: '',
      ingredients: [],
      steps: [],
      nutrition: null,
    }

    // ── 方法1: JSON-LD (Schema.org) ──
    $('script[type="application/ld+json"]').each((_i, el) => {
      // 如果已解析到标题，跳过
      if (parsed.title) return true

      try {
        const json = JSON.parse($(el).html() || '{}')
        const items = json['@graph'] || [json]
        for (const item of items) {
          const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']]
          if (!types.some(t => typeof t === 'string' && t.includes('Recipe'))) continue

          // 标题
          if (item.name) parsed.title = String(item.name)
          // 简介
          if (item.description) parsed.description = String(item.description).replace(/\s+/g, ' ')
          // 封面
          if (item.image) {
            if (typeof item.image === 'string') parsed.coverImage = item.image
            else if (Array.isArray(item.image)) parsed.coverImage = item.image[0]
            else if (item.image.url) parsed.coverImage = item.image.url
          }
          // 烹饪时间 (ISO 8601)
          if (item.totalTime) {
            const t = String(item.totalTime)
            let mins = 0
            const hMatch = t.match(/(\d+)H/)
            const mMatch = t.match(/(\d+)M/)
            if (hMatch) mins += parseInt(hMatch[1], 10) * 60
            if (mMatch) mins += parseInt(mMatch[1], 10)
            if (mins > 0) parsed.cookTime = mins
          }
          // 份数
          if (item.recipeYield) {
            const y = String(item.recipeYield).match(/\d+/)
            if (y) parsed.servings = parseInt(y[0], 10)
          }
          // 食材
          if (item.recipeIngredient && Array.isArray(item.recipeIngredient)) {
            parsed.ingredients = item.recipeIngredient.map(function(ing) {
              var s = String(ing).trim()
              if (!s) return null
              // 尝试拆分数量和单位
              var amount = 0, unit = 'g', name = s
              var amtMatch = s.match(/^(\d+(?:[./]\d+)?)\s*/)
              if (amtMatch) {
                var frac = amtMatch[1]
                if (frac.includes('/')) {
                  var parts = frac.split('/')
                  amount = parseFloat(parts[0]) / parseFloat(parts[1])
                } else {
                  amount = parseFloat(frac)
                }
                name = s.slice(amtMatch[0].length)
                // 继续尝试匹配单位
                var unitMatch = name.match(/^(g|kg|ml|l|个|根|勺|杯|汤匙|茶匙|片|瓣|块|只|条|碗|粒|颗|小匙|大匙|小勺|大勺|头|扎|把|份|粒|汤勺|茶勺|tsp|tbsp|cup|oz|lb|pound|ounce|克|千克|毫升|升)\s*/i)
                if (unitMatch) {
                  unit = unitMatch[1].toLowerCase()
                  name = name.slice(unitMatch[0].length)
                }
              }
              return { name: name.trim(), amount: amount, unit: unit }
            }).filter(Boolean)
          }
          // 步骤
          if (item.recipeInstructions && Array.isArray(item.recipeInstructions)) {
            parsed.steps = item.recipeInstructions.map(function(step, idx) {
              var content = ''
              if (typeof step === 'string') content = step
              else if (step.text) content = step.text
              else if (step.name) content = step.name
              if (!content || !content.trim()) return null
              return { stepNumber: idx + 1, content: content.trim() }
            }).filter(Boolean)
          }
          // 营养信息
          if (item.nutrition) {
            var n = item.nutrition
            var nut = {}
            if (n.calories) nut.calories = extractNum(n.calories)
            if (n.proteinContent || n.protein) nut.protein = extractNum(n.proteinContent || n.protein)
            if (n.fatContent || n.fat) nut.fat = extractNum(n.fatContent || n.fat)
            if (n.carbohydrateContent || n.carbohydrates || n.carbs) nut.carbs = extractNum(n.carbohydrateContent || n.carbohydrates || n.carbs)
            if (n.fiberContent || n.fiber) nut.fiber = extractNum(n.fiberContent || n.fiber)
            if (n.sodiumContent || n.sodium) nut.sodium = extractNum(n.sodiumContent || n.sodium)
            if (Object.keys(nut).length > 0) parsed.nutrition = nut
          }

          // 找到就 break（each callback 返回 true 继续）
          break
        }
      } catch (e) {
        // 跳过解析失败的 JSON-LD
      }
    })

    // ── 方法2: Open Graph / meta 回退 ──
    if (!parsed.title) {
      parsed.title = $('meta[property="og:title"]').attr('content') || $('title').text().trim() || ''
      parsed.description = parsed.description || $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''
      parsed.coverImage = parsed.coverImage || $('meta[property="og:image"]').attr('content') || ''
    }

    // ── 数据清理 ──
    if (parsed.title.length > 100) parsed.title = parsed.title.substring(0, 100)
    if (parsed.description && parsed.description.length > 500) parsed.description = parsed.description.substring(0, 500)

    if (!parsed.title && parsed.ingredients.length === 0 && parsed.steps.length === 0) {
      return res.status(422).json(resJSON(422, '无法解析页面中的食谱数据，该页面可能不包含结构化食谱信息', null))
    }

    if (!parsed.title && parsed.steps.length > 0) {
      parsed.title = '导入食谱 (' + new Date().toLocaleDateString('zh-CN') + ')'
    }

    return res.status(200).json(resJSON(0, 'ok', parsed))
  } catch (err) {
    console.error('[POST /import] Error:', err)
    return res.status(500).json(resJSON(500, '服务器内部错误', null))
  }
})

module.exports = router