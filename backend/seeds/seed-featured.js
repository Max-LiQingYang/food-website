/**
 * seeds/seed-featured.js
 * 编辑精选脚本 —— 添加 isFeatured 列并标记精选食谱
 *
 * 用法：
 *   生产环境：node seeds/seed-featured.js
 *   测试环境：npx jest tests/backend/recipes.test.js (表已创建时)
 */

require('dotenv').config()
const { Sequelize, DataTypes } = require('sequelize')

const {
  DB_HOST = '172.17.0.1',
  DB_PORT = '3306',
  DB_NAME = 'food_website',
  DB_USER = 'root',
  DB_PASSWORD = 'food',
} = process.env

async function run() {
  console.log('📦 连接数据库...')
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: parseInt(DB_PORT),
    dialect: 'mysql',
    logging: msg => console.log('  SQL:', msg),
  })

  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')
  } catch (err) {
    console.error('❌ 数据库连接失败:', err.message)
    process.exit(1)
  }

  // 1. 添加 isFeatured 列（如果不存在）
  console.log('\n🔄 检查 isFeatured 列...')
  try {
    await sequelize.query(
      "ALTER TABLE recipes ADD COLUMN isFeatured TINYINT(1) NOT NULL DEFAULT 0 COMMENT '编辑精选标记'"
    )
    console.log('✅ 添加 isFeatured 列成功')
  } catch (err) {
    if (err.message.includes('Duplicate column')) {
      console.log('ℹ️  isFeatured 列已存在，跳过')
    } else {
      console.error('❌ 添加列失败:', err.message)
      process.exit(1)
    }
  }

  // 2. 标记精选食谱（按标题匹配）
  const featuredTitles = [
    '宫保鸡丁',
    '提拉米苏',
    '西红柿炒鸡蛋',
  ]

  // 额外最多2道（从已有数据中按热度选取）
  const allRecipes = await sequelize.query(
    "SELECT id, title, favoriteCount FROM recipes WHERE isFeatured = 0 ORDER BY favoriteCount DESC LIMIT 5",
    { type: Sequelize.QueryTypes.SELECT }
  )

  const extraTitles = allRecipes
    .filter(r => !featuredTitles.includes(r.title))
    .slice(0, 2)
    .map(r => r.title)

  const finalTitles = [...featuredTitles, ...extraTitles]

  for (const title of finalTitles) {
    await sequelize.query(
      `UPDATE recipes SET isFeatured = 1 WHERE title = ?`,
      { replacements: [title] }
    )
  }

  console.log(`✅ 已标记 ${finalTitles.length} 道精选食谱:`)
  finalTitles.forEach(t => console.log(`   - ${t}`))

  // 3. 确认
  const featuredCount = await sequelize.query(
    "SELECT COUNT(*) as count FROM recipes WHERE isFeatured = 1",
    { type: Sequelize.QueryTypes.SELECT }
  )
  console.log(`\n📊 数据库中共有 ${featuredCount[0].count} 道精选食谱`)

  await sequelize.close()
  console.log('\n✅ 精选脚本执行完毕')
}

run().catch(err => {
  console.error('脚本执行失败:', err)
  process.exit(1)
})