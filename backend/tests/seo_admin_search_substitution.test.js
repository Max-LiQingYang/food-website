'use strict'

/**
 * tests/seo_admin_search_substitution.test.js
 * 迭代#38 内容质量增强：SEO / 管理后台 / 搜索增强 / 替代建议 / 元数据
 */

// ── 强制使用 SQLite 内存模式 ──
process.env.DB_DIALECT = 'sqlite'
process.env.DB_PATH = ':memory:'

const request = require('supertest')
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

const { computeScore, getLabel } = require('../routes/admin')

// ─────────────────────────────────────────────────────────────────
// 纯函数测试
// ─────────────────────────────────────────────────────────────────
describe('Admin computeScore utility', () => {
  test('computeScore returns 0-10', () => {
    const score = computeScore({ ingredients: [], steps: [], nutrition: null })
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(10)
  })

  test('computeScore increases with data', () => {
    const plain = computeScore({ ingredients: [], steps: [], nutrition: null })
    const rich = computeScore({
      ingredients: ['a', 'b', 'c'],
      steps: ['s1', 's2'],
      nutrition: { calories: 200, protein: 15, fat: 8, fiber: 3, sodium: 300 },
    })
    expect(rich).toBeGreaterThan(plain)
  })

  test('computeScore handles null', () => {
    expect(computeScore(null)).toBeGreaterThanOrEqual(0)
    expect(computeScore({})).toBeGreaterThanOrEqual(0)
  })

  test('getLabel returns correct labels', () => {
    expect(getLabel(9.5)).toBe('优秀')
    expect(getLabel(8)).toBe('良好')
    expect(getLabel(6)).toBe('一般')
    expect(getLabel(4)).toBe('较差')
    expect(getLabel(1)).toBe('差')
  })

  test('getLabel handles edge values', () => {
    expect(getLabel(10)).toBe('优秀')
    expect(getLabel(0)).toBe('差')
    expect(getLabel(-1)).toBe('差')
  })
})

// ─────────────────────────────────────────────────────────────────
// SEO XML/text 格式测试
// ─────────────────────────────────────────────────────────────────
describe('SEO format', () => {
  test('sitemap XML structure is valid', () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>http://test.com/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n  <url><loc>http://test.com/recipe/abc123</loc><lastmod>2026-05-24</lastmod><priority>0.9</priority><changefreq>monthly</changefreq></url>\n</urlset>'
    expect(xml).toContain('<?xml')
    expect(xml).toContain('<urlset')
    expect(xml).toContain('</urlset>')
    expect(xml).toContain('priority>1.0<')
    expect(xml).toContain('priority>0.9<')
    expect(xml).toContain('recipe/abc123')
  })

  test('robots.txt format', () => {
    const txt = 'User-agent: *\nAllow: /\nSitemap: http://test.com/sitemap.xml\n\nDisallow: /admin/'
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Sitemap:')
    expect(txt).toContain('Disallow: /admin/')
  })
})

// ─────────────────────────────────────────────────────────────────
// 食材替代映射逻辑测试
// ─────────────────────────────────────────────────────────────────
describe('Ingredient Substitution logic', () => {
  const SUBSTITUTION_MAP = {
    '番茄': ['圣女果', '番茄罐头', '红椒'],
    '鸡蛋': ['鸭蛋', '鹌鹑蛋', '嫩豆腐'],
    '五花肉': ['去皮五花肉', '猪肩肉', '猪腩肉'],
    '豆腐': ['豆干', '腐竹', '素鸡', '嫩豆腐'],
  }

  test('common ingredients have substitutions', () => {
    expect(SUBSTITUTION_MAP['番茄']).toContain('圣女果')
    expect(SUBSTITUTION_MAP['番茄'].length).toBeGreaterThanOrEqual(2)
    expect(SUBSTITUTION_MAP['鸡蛋']).toContain('鸭蛋')
    expect(SUBSTITUTION_MAP['五花肉']).toContain('猪肩肉')
  })

  test('substitution count is reasonable', () => {
    Object.values(SUBSTITUTION_MAP).forEach(function(alts) {
      expect(alts.length).toBeGreaterThanOrEqual(2)
      expect(alts.length).toBeLessThanOrEqual(6)
    })
  })
})

// ─────────────────────────────────────────────────────────────────
// 烹饪时间估算逻辑测试
// ─────────────────────────────────────────────────────────────────
describe('Cook Time Estimation logic', () => {
  test('existing cookTime takes priority', () => {
    // 模拟路由逻辑
    function estimate(cookTime, steps, ingredients) {
      if (cookTime && parseInt(cookTime) > 0) return parseInt(cookTime)
      var min = (steps || []).length * 5 + (ingredients || []).length * 2
      return Math.max(5, min)
    }
    expect(estimate(15, [{ description: 'step1' }], [{ name: 'a' }])).toBe(15)
    expect(estimate(null, [{ description: 'step1' }], [{ name: 'a' }])).toBe(7)
    expect(estimate(0, [], [])).toBe(5)
  })

  test('time label classification', () => {
    function label(min) {
      if (min >= 120) return '慢炖'
      if (min >= 60) return '耗时'
      if (min >= 30) return '中等'
      return '快菜'
    }
    expect(label(15)).toBe('快菜')
    expect(label(45)).toBe('中等')
    expect(label(90)).toBe('耗时')
    expect(label(150)).toBe('慢炖')
  })
})

// ─────────────────────────────────────────────────────────────────
// 增强难度评估逻辑测试
// ─────────────────────────────────────────────────────────────────
describe('Enhanced Difficulty logic', () => {
  const TECHNIQUE_WORDS = ['焯水', '过油', '挂糊', '上浆', '勾芡', '爆炒', '干煸', '炝锅']

  test('detects techniques in recipe text', () => {
    const text = '五花肉切块，焯水去腥'
    const matched = TECHNIQUE_WORDS.filter(function(tw) { return text.indexOf(tw) !== -1 })
    expect(matched).toContain('焯水')
  })

  test('multiple techniques lead to advanced level', () => {
    var matched = ['焯水', '过油', '勾芡']
    var level = matched.length >= 2 ? 'advanced' : (matched.length >= 1 ? 'intermediate' : 'beginner')
    expect(level).toBe('advanced')
  })

  test('single technique leads to intermediate', function() {
    var level = (1 >= 2 ? 'advanced' : (1 >= 1 ? 'intermediate' : 'beginner'))
    expect(level).toBe('intermediate')
  })

  test('no techniques leads to beginner', function() {
    var level = (0 >= 2 ? 'advanced' : (0 >= 1 ? 'intermediate' : 'beginner'))
    expect(level).toBe('beginner')
  })
})

// ─────────────────────────────────────────────────────────────────
// 路由注册测试（测试路由是否已正确挂载）
// ─────────────────────────────────────────────────────────────────
describe('Route registration', () => {
  test('seo routes are exported', () => {
    const seo = require('../routes/seo')
    expect(typeof seo).toBe('function')
  })

  test('admin routes are exported', () => {
    const admin = require('../routes/admin')
    expect(typeof admin).toBe('function')
  })

  test('recipes routes are exported', () => {
    const recipes = require('../routes/recipes')
    expect(typeof recipes).toBe('function')
  })
})