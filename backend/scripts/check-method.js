/**
 * check-method.js — 检查哪些食谱的 method 字段为空
 */
const { Sequelize } = require('sequelize')
const s = new Sequelize(
  process.env.DB_NAME || 'food_website',
  process.env.DB_USER || 'food_user',
  process.env.DB_PASSWORD || 'food_password',
  { host: process.env.DB_HOST || '172.17.0.1', dialect: 'mysql', logging: false }
)

async function main() {
  await s.authenticate()
  const [rows] = await s.query('SELECT id, title, categoryTags FROM recipes')
  let empty = 0
  let hasEng = 0
  for (const r of rows) {
    const ct = JSON.parse(r.categoryTags)
    if (!ct.method || ct.method === '') {
      empty++
      console.log(`  empty method: ${r.title} — ${JSON.stringify(ct)}`)
    }
    // 检查英文
    const engWords = ['french','indian','japanese','mexican','vietnamese','mediterranean','thai','korean',
      'bake','braise','raw','blend','wrap','simmer','grill','medium','low','high',
      'almond','flour','avocado','chicken','chickpeas','beef','seafood','rice','cheese']
    for (const w of engWords) {
      if (r.categoryTags.includes(w)) {
        hasEng++
        console.log(`  eng: ${r.title} — ${r.categoryTags.substr(0,120)}`)
        break
      }
    }
  }
  console.log(`\nTotal: ${rows.length}, empty method: ${empty}, has english: ${hasEng}`)
  await s.close()
}
main()
