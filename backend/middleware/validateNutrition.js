'use strict'

/**
 * middleware/validateNutrition.js
 * 食谱 nutrition 字段写入校验
 *
 * 校验规则：
 *   1. 如果提供 nutrition，必须是合法 JSON 对象（或可 JSON.parse 的字符串）
 *   2. 数值范围校验
 */

const NUTRITION_RANGES = {
  calories: { min: 5, max: 3000 },    // kcal per serving
  protein:  { min: 0, max: 500 },     // g
  fat:      { min: 0, max: 500 },     // g
  carbs:    { min: 0, max: 500 },     // g
  fiber:    { min: 0, max: 100 },     // g
  sodium:   { min: 0, max: 10000 },   // mg
}

function validateNutrition(req, res, next) {
  const { nutrition } = req.body
  if (nutrition === undefined || nutrition === null) return next()

  let parsed = nutrition
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch {
      return res.status(400).json({ code: 400, message: 'nutrition 必须是合法 JSON', data: null })
    }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return res.status(400).json({ code: 400, message: 'nutrition 必须是 JSON 对象', data: null })
  }

  // 数值范围校验
  const errors = []
  for (const [key, range] of Object.entries(NUTRITION_RANGES)) {
    const val = parsed[key]
    if (val !== undefined && val !== null) {
      const num = Number(val)
      if (isNaN(num)) {
        errors.push(`${key} 必须是数字`)
      } else if (num < range.min || num > range.max) {
        errors.push(`${key} 超出合理范围 (${range.min}~${range.max})`)
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ code: 400, message: `nutrition 校验失败: ${errors.join('; ')}`, data: null })
  }

  // 标准化：写入 DB 前转为 JSON 字符串
  req.body.nutrition = JSON.stringify(parsed)
  next()
}

module.exports = validateNutrition
