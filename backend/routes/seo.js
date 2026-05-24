'use strict'

/**
 * routes/seo.js
 * SEO 优化端点 — 站点地图 / robots.txt / 结构化数据辅助
 */

const express = require('express')
const router = express.Router()
const { Recipe, Op } = require('../models')

// ─── GET /api/sitemap.xml — 动态站点地图 ────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const recipes = await Recipe.findAll({
      attributes: ['id', 'title', 'updatedAt', 'category'],
      order: [['updatedAt', 'DESC']],
    })

    const baseUrl = `${req.protocol}://${req.get('host')}`
    const today = new Date().toISOString().split('T')[0]
    const categories = [...new Set(recipes.map(r => r.category).filter(Boolean))]

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    // 首页
    xml += `  <url><loc>${baseUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n`

    // 静态页面
    const staticPages = ['/search', '/recommend', '/rankings', '/collections', '/pantry', '/nutrition', '/tools', '/challenges', '/tags']
    staticPages.forEach(p => {
      xml += `  <url><loc>${baseUrl}${p}</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>\n`
    })

    // 分类页面
    categories.forEach(cat => {
      xml += `  <url><loc>${baseUrl}/search?category=${encodeURIComponent(cat)}</loc><priority>0.7</priority><changefreq>weekly</changefreq></url>\n`
    })

    // 食谱详情页面
    recipes.forEach(r => {
      const lastmod = r.updatedAt ? new Date(r.updatedAt).toISOString().split('T')[0] : today
      xml += `  <url><loc>${baseUrl}/recipe/${r.id}</loc><lastmod>${lastmod}</lastmod><priority>0.9</priority><changefreq>monthly</changefreq></url>\n`
    })

    xml += '</urlset>'

    res.header('Content-Type', 'application/xml; charset=utf-8')
    res.send(xml)
  } catch (err) {
    console.error('[GET /sitemap.xml] Error:', err)
    res.status(500).send('<?xml version="1.0"?><error>Internal Server Error</error>')
  }
})

// ─── GET /api/robots.txt — robots.txt ───────────────────────────
router.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const txt = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${baseUrl}/api/sitemap.xml`,
    '',
    '# Disallow admin pages',
    'Disallow: /admin/',
    'Disallow: /api/admin/',
    'Disallow: /login',
    'Disallow: /register',
    '',
    '# Crawl delay',
    'Crawl-Delay: 10',
  ].join('\n')

  res.header('Content-Type', 'text/plain; charset=utf-8')
  res.send(txt)
})

module.exports = router