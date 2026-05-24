'use strict'

/**
 * routes/export.js
 * 食谱数据导出 — Markdown / PDF
 *
 * 导出格式：
 *   - Markdown: 生成标准 Markdown 格式文本
 *   - PDF: 使用 PDFKit 生成格式化文档
 */

const express = require('express')
const router = express.Router()
const { Recipe, User } = require('../models')
const PDFDocument = require('pdfkit')

// 生成 Markdown
function generateMarkdown(recipe) {
  const lines = []
  lines.push(`# ${recipe.title}`)
  lines.push('')

  if (recipe.description) {
    lines.push(`> ${recipe.description}`)
    lines.push('')
  }

  lines.push(`- **分类**: ${recipe.category || '未分类'}`)
  lines.push(`- **难度**: ${recipe.difficulty || '未标注'}`)
  lines.push(`- **份量**: ${recipe.servings || '未标注'}`)
  lines.push(`- **烹饪时间**: ${recipe.cookTime || '未标注'}`)
  if (recipe.preparationTime) lines.push(`- **准备时间**: ${recipe.preparationTime}`)
  lines.push('')

  // 食材
  lines.push('## 🛒 食材清单')
  lines.push('')
  let ingredients = recipe.ingredients
  if (typeof ingredients === 'string') {
    try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
  }
  if (Array.isArray(ingredients)) {
    ingredients.forEach(i => {
      const name = typeof i === 'string' ? i : (i.name || i.ingredient || '')
      const amount = typeof i === 'string' ? '' : (i.amount || i.quantity || '')
      if (name) lines.push(`- ${name}${amount ? ` — ${amount}` : ''}`)
    })
  }
  lines.push('')

  // 烹饪步骤
  lines.push('## 👨‍🍳 烹饪步骤')
  lines.push('')
  let steps = recipe.steps
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps) } catch { steps = [] }
  }
  if (Array.isArray(steps)) {
    steps.forEach((s, i) => {
      const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
      if (text) lines.push(`### 第 ${i + 1} 步\n\n${text}\n`)
    })
  }
  lines.push('')

  // 小贴士
  if (recipe.tips) {
    lines.push('## 💡 小贴士')
    lines.push('')
    lines.push(`${recipe.tips}`)
    lines.push('')
  }

  // 营养信息
  let nutrition = recipe.nutrition
  if (typeof nutrition === 'string') {
    try { nutrition = JSON.parse(nutrition) } catch { nutrition = null }
  }
  if (nutrition && typeof nutrition === 'object') {
    lines.push('## 📊 营养信息')
    lines.push('')
    lines.push('| 项目 | 含量 |')
    lines.push('|------|------|')
    if (nutrition.calories) lines.push(`| 热量 | ${nutrition.calories} kcal |`)
    if (nutrition.protein) lines.push(`| 蛋白质 | ${nutrition.protein} g |`)
    if (nutrition.fat) lines.push(`| 脂肪 | ${nutrition.fat} g |`)
    if (nutrition.fiber) lines.push(`| 纤维 | ${nutrition.fiber} g |`)
    if (nutrition.sodium) lines.push(`| 钠 | ${nutrition.sodium} mg |`)
    if (nutrition.carbs) lines.push(`| 碳水化合物 | ${nutrition.carbs} g |`)
    lines.push('')
  }

  return lines.join('\n')
}

// 生成 PDF
function generatePDF(recipe, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: recipe.title,
      Author: '美食食谱',
      Subject: '食谱导出',
    },
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(recipe.title)}.pdf"`)

  doc.pipe(res)

  // 标题
  doc.fontSize(24).font('Helvetica-Bold').text(recipe.title, { align: 'center' })
  doc.moveDown(0.5)

  if (recipe.description) {
    doc.fontSize(12).font('Helvetica-Oblique').text(recipe.description, { align: 'center' })
    doc.moveDown()
  }

  // 元信息
  doc.fontSize(10).font('Helvetica')
  const meta = [
    `分类: ${recipe.category || '未分类'}`,
    `难度: ${recipe.difficulty || '未标注'}`,
    `份量: ${recipe.servings || '未标注'}`,
    `烹饪时间: ${recipe.cookTime || '未标注'}`,
  ]
  doc.text(meta.join('  |  '), { align: 'center' })
  doc.moveDown(1.5)

  // 食材清单
  doc.fontSize(16).font('Helvetica-Bold').text('食材清单')
  doc.moveDown(0.3)
  doc.fontSize(11).font('Helvetica')

  let ingredients = recipe.ingredients
  if (typeof ingredients === 'string') {
    try { ingredients = JSON.parse(ingredients) } catch { ingredients = [] }
  }
  if (Array.isArray(ingredients)) {
    ingredients.forEach(i => {
      const name = typeof i === 'string' ? i : (i.name || i.ingredient || '')
      const amount = typeof i === 'string' ? '' : (i.amount || i.quantity || '')
      if (name) doc.text(`• ${name}${amount ? `  —  ${amount}` : ''}`, { indent: 10 })
    })
  }
  doc.moveDown(1.5)

  // 烹饪步骤
  doc.fontSize(16).font('Helvetica-Bold').text('烹饪步骤')
  doc.moveDown(0.3)

  let steps = recipe.steps
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps) } catch { steps = [] }
  }
  if (Array.isArray(steps)) {
    steps.forEach((s, i) => {
      const text = typeof s === 'string' ? s : (s.description || s.text || s.step || '')
      if (text) {
        doc.fontSize(12).font('Helvetica-Bold').text(`步骤 ${i + 1}`)
        doc.fontSize(11).font('Helvetica').text(text, { indent: 10 })
        doc.moveDown(0.3)
      }
    })
  }
  doc.moveDown(1)

  // 小贴士
  if (recipe.tips) {
    doc.fontSize(14).font('Helvetica-Bold').text('小贴士')
    doc.fontSize(11).font('Helvetica')
    doc.text(recipe.tips, { indent: 10 })
    doc.moveDown(1.5)
  }

  // 营养信息
  let nutrition = recipe.nutrition
  if (typeof nutrition === 'string') {
    try { nutrition = JSON.parse(nutrition) } catch { nutrition = null }
  }
  if (nutrition && typeof nutrition === 'object') {
    doc.fontSize(14).font('Helvetica-Bold').text('营养信息（每份）')
    doc.moveDown(0.3)
    doc.fontSize(11).font('Helvetica')

    const nutItems = [
      ['热量', nutrition.calories, 'kCal'],
      ['蛋白质', nutrition.protein, 'g'],
      ['脂肪', nutrition.fat, 'g'],
      ['纤维', nutrition.fiber, 'g'],
      ['钠', nutrition.sodium, 'mg'],
      ['碳水化合物', nutrition.carbs, 'g'],
    ]

    // 画个简单的营养素表格
    const startX = 60
    const colWidth = 120
    let yPos = doc.y

    nutItems.forEach((item, i) => {
      if (item[1] != null) {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = startX + col * colWidth * 1.5
        const y = doc.y + row * 22
        if (i % 2 === 0) { yPos = doc.y } // reset on even
        doc.text(`${item[0]}: ${item[1]} ${item[2]}`, x, yPos + row * 22, {
          width: colWidth * 1.5,
        })
        if (i === 1 || i === 3 || i === 5) {
          doc.y = yPos + (row + 1) * 22
        }
      }
    })

    doc.moveDown(1)
  }

  // 页脚
  doc.fontSize(9).font('Helvetica-Oblique')
  doc.text('—— 由美食食谱自动生成 ——', { align: 'center' })

  doc.end()
}

// GET /api/recipes/:id/export — 导出食谱
router.get('/recipes/:id/export', async (req, res) => {
  try {
    const { format = 'md' } = req.query

    if (!['md', 'markdown', 'pdf'].includes(format.toLowerCase())) {
      return res.status(400).json({ code: 400, message: '仅支持 format=md 或 format=pdf' })
    }

    const recipe = await Recipe.findByPk(req.params.id, {
      attributes: [
        'id', 'title', 'description', 'category', 'difficulty',
        'servings', 'cookTime', 'preparationTime',
        'ingredients', 'steps', 'tips', 'nutrition',
      ],
    })

    if (!recipe) {
      return res.status(404).json({ code: 404, message: '食谱不存在' })
    }

    if (format === 'pdf') {
      generatePDF(recipe, res)
    } else {
      const md = generateMarkdown(recipe)
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(recipe.title)}.md"`)
      res.send(md)
    }
  } catch (err) {
    console.error('[GET /export] error:', err.message)
    res.status(500).json({ code: 500, message: '导出失败' })
  }
})

module.exports = router
module.exports.generateMarkdown = generateMarkdown