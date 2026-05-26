/**
 * seed-summer-season-enhance.js
 * 迭代 #64：智能季节标签优化
 * 对 season="all" 的食谱按食材/烹饪/地域特色分配具体季节
 *
 * 运行方式：
 *   docker exec -i food-backend node -e "$(cat seeds/seed-summer-season-enhance.js)"
 *
 * 推理依据（初夏季节，重点优化 summer/winter 分布）：
 * 
 * → winter（暖身/辣/炖煮/浓郁）:
 *   麻婆豆腐 - 麻辣暖身，冬季经典
 *   卤肉饭 - 浓郁卤肉暖身盖饭
 *   剁椒鱼头 - 蒸鱼鲜辣暖胃
 *   酸菜鱼 - 酸汤热鱼冬季暖身
 *   辣子鸡 - 干辣椒花椒驱寒
 *   小炒黄牛肉 - 猛火爆炒暖身菜
 *   水煮鱼（改编） - 红油麻辣暖身
 *
 * → summer（清爽/冷食/轻烹/消暑）:
 *   白切鸡 - 白煮冷吃夏日清爽
 *   虾饺 - 鲜美清淡夏日茶点
 *   蒜蓉粉丝蒸扇贝 - 轻盈海鲜夏季佳品
 *   酸辣土豆丝 - 酸辣爽口开胃
 *   章鱼小丸子 - 夏日祭典小吃
 *   冬阴功汤 - (已有 summer 副本) 确认设置
 *
 * → spring（时令/清淡/鲜嫩）:
 *   小炒肉 - 青椒五花肉清新
 *   干炒牛河 - 干炒清淡夜宵
 *   扬州炒饭 - 五彩缤纷春意
 *
 * → autumn（丰收/浓郁/温润）:
 *   糖醋排骨 - 酸甜排骨秋日风味
 *   回锅肉 (both) - 蒜苗回锅时令
 */

const SEASON_MAP = {
  // → winter
  '麻婆豆腐': 'winter',
  '卤肉饭': 'winter',
  '剁椒鱼头': 'winter',
  '酸菜鱼': 'winter',
  '辣子鸡': 'winter',
  '小炒黄牛肉': 'winter',
  '水煮鱼（改编）': 'winter',

  // → summer
  '白切鸡': 'summer',
  '虾饺': 'summer',
  '蒜蓉粉丝蒸扇贝': 'summer',
  '酸辣土豆丝': 'summer',
  '章鱼小丸子': 'summer',
  '冬阴功汤': 'summer',

  // → spring
  '小炒肉': 'spring',
  '干炒牛河': 'spring',
  '扬州炒饭': 'spring',

  // → autumn
  '糖醋排骨': 'autumn',
  '回锅肉': 'autumn',
}

// Fork 食谱元数据补充
const FORK_META = {
  '水煮鱼（改编）': {
    story: '水煮鱼起源于川渝地区，最早是船工渔民在江边就地取材的吃法。将活鱼现杀片成薄片，在滚烫的辣椒油中汆烫至熟，麻辣鲜香扑鼻。改编版在保留传统麻辣风味的基础上，减少了油脂用量，让这道江湖名菜更符合现代健康饮食理念。记得第一次做这道菜时满屋飘香，连邻居都来敲门问在做什么好吃的。',
    culturalBackground: '水煮鱼是川菜江湖菜的代表之一，20世纪80年代在重庆流行开来。"水煮"并非真的用水煮，而是用大量热油浇淋，使鱼片在高温油中瞬间熟成，锁住鲜嫩。传统的辣椒、花椒双麻双辣口感，体现了川菜"一菜一格，百菜百味"的烹饪哲学。如今水煮鱼已从重庆走向全国，成为国民级川菜招牌。',
    tips: '1. 鱼片要用蛋清和淀粉腌制，口感更嫩滑。2. 最后浇热油时油温要足够高，才能激发出辣椒花椒的香味。3. 改编版减少油量后，可将热油分两次浇淋，第一次激发香味，第二次锁住温度。4. 垫底的豆芽建议焯水后铺底，不与鱼片同煮以保持脆爽。',
    season: 'winter'
  }
}

const { Sequelize } = require('sequelize')

async function main() {
  const sequelize = new Sequelize('food_website', 'food_user', 'food_password', {
    host: '172.17.0.1',
    dialect: 'mysql',
    logging: false
  })
  await sequelize.authenticate()
  console.log('✅ DB connected')

  // 1. 更新季节标签（只更新 season='all' 的）
  let updated = 0
  let skipped = 0
  for (const [title, season] of Object.entries(SEASON_MAP)) {
    const [r] = await sequelize.query(
      `UPDATE recipes SET season = ? WHERE title = ? AND season = 'all'`,
      { replacements: [season, title] }
    )
    if (r.affectedRows > 0) {
      updated += r.affectedRows
      console.log(`  ✅ ${title} → ${season} (${r.affectedRows} row(s))`)
    } else {
      skipped++
    }
  }
  console.log(`\n📊 Season updates: ${updated} updated, ${skipped} title(s) with no 'all' match`)

  // 2. 更新 fork 食谱元数据
  for (const [title, meta] of Object.entries(FORK_META)) {
    const [r] = await sequelize.query(
      `UPDATE recipes SET story = ?, culturalBackground = ?, tips = ?, season = ? WHERE title = ?`,
      {
        replacements: [
          meta.story, meta.culturalBackground, meta.tips, meta.season, title
        ]
      }
    )
    if (r.affectedRows > 0) {
      console.log(`  ✅ ${title}: story/culturalBackground/tips/season filled (${r.affectedRows} row(s))`)
    } else {
      console.log(`  ⚠️  ${title}: not found in DB`)
    }
  }

  // 3. 验证最终分布
  const [stats] = await sequelize.query(
    `SELECT season, COUNT(*) as cnt FROM recipes GROUP BY season ORDER BY FIELD(season, 'winter','spring','summer','autumn','all')`
  )
  console.log('\n📊 Final season distribution:')
  stats.forEach(s => console.log(`   ${s.season || 'null'}: ${s.cnt}`))

  await sequelize.close()
  console.log('\n✅ Done')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })