const VIDEO_MAP = [
  {
    title: '东北乱炖',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1xoAhzxEuZ/', platform: 'bilibili', title: '东北乱炖家常做法', duration: 480, sortOrder: 0 },
    ],
  },
  {
    title: '蒜蓉粉丝蒸扇贝',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1eN4y1H7VY/', platform: 'bilibili', title: '蒜蓉粉丝蒸扇贝做法', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '麻酱凉面',
    videos: [
      { url: 'https://www.bilibili.com/video/BV16pGt65E2Y/', platform: 'bilibili', title: '麻酱凉面做法', duration: 300, sortOrder: 0 },
    ],
  },
  {
    title: '红烧牛腩',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1bi516jE4Q/', platform: 'bilibili', title: '红烧牛腩家常做法', duration: 600, sortOrder: 0 },
    ],
  },
  {
    title: '干锅花菜',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1hipUzaEHH/', platform: 'bilibili', title: '干锅花菜做法', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '蚝油生菜',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1M44y187u6/', platform: 'bilibili', title: '蚝油生菜做法', duration: 240, sortOrder: 0 },
    ],
  },
  {
    title: '啤酒鸭',
    videos: [
      { url: 'https://www.bilibili.com/video/BV13DR4BvEy9/', platform: 'bilibili', title: '啤酒鸭做法', duration: 480, sortOrder: 0 },
    ],
  },
  {
    title: '扬州炒饭',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1sU4y1B7MC/', platform: 'bilibili', title: '扬州炒饭做法', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '小炒肉',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1Y7Gb6qE8M/', platform: 'bilibili', title: '辣椒炒肉/小炒肉家常做法', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '韩式泡菜炒五花肉',
    videos: [
      { url: 'https://www.bilibili.com/video/BV1rp4y1C761/', platform: 'bilibili', title: '韩式泡菜炒五花肉做法', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '韩式炒年糕',
    videos: [
      { url: 'https://www.youtube.com/embed/rggS-GidUpk', platform: 'youtube', title: 'How to Make Tteokbokki (Spicy Korean Rice Cakes)', duration: 480, sortOrder: 0 },
      { url: 'https://www.youtube.com/embed/ZhUGVCT22EA', platform: 'youtube', title: 'Easy Tteokbokki Recipe', duration: 360, sortOrder: 1 },
    ],
  },
  {
    title: '抹茶千层蛋糕',
    videos: [
      { url: 'https://www.youtube.com/embed/Iog-pNmqvhU', platform: 'youtube', title: 'Matcha Crepe Cake Recipe', duration: 600, sortOrder: 0 },
    ],
  },
  {
    title: '番茄意面',
    videos: [
      { url: 'https://www.youtube.com/embed/DfB0EtvUv1c', platform: 'youtube', title: 'Pomodoro Pasta Recipe', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '法式焦糖布丁',
    videos: [
      { url: 'https://www.youtube.com/embed/6tSdlo0r0Io', platform: 'youtube', title: 'Creme Brulee Recipe', duration: 480, sortOrder: 0 },
    ],
  },
  {
    title: '越南牛肉河粉',
    videos: [
      { url: 'https://www.youtube.com/embed/WlosNFMCnE4', platform: 'youtube', title: 'Authentic Vietnamese Pho Recipe', duration: 600, sortOrder: 0 },
    ],
  },
  {
    title: '奶油蘑菇汤',
    videos: [
      { url: 'https://www.youtube.com/embed/pKedpDltnOM', platform: 'youtube', title: 'Mushroom Soup Recipe', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '韩式拌饭',
    videos: [
      { url: 'https://www.youtube.com/embed/fBjEWpYv1K8', platform: 'youtube', title: 'Bibimbap Recipe', duration: 480, sortOrder: 0 },
    ],
  },
  {
    title: '味噌拉面',
    videos: [
      { url: 'https://www.youtube.com/embed/_pIdGMX65qM', platform: 'youtube', title: 'Miso Ramen Recipe', duration: 480, sortOrder: 0 },
    ],
  },
  {
    title: '日式照烧鸡腿',
    videos: [
      { url: 'https://www.youtube.com/embed/Rs3fqWuVb94', platform: 'youtube', title: 'Teriyaki Chicken Recipe', duration: 360, sortOrder: 0 },
    ],
  },
  {
    title: '泰式绿咖喱鸡',
    videos: [
      { url: 'https://www.youtube.com/embed/zPkOPx1Oelw', platform: 'youtube', title: 'Thai Green Curry Recipe', duration: 480, sortOrder: 0 },
    ],
  },
]

// ── Script body ──
const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(
  process.env.DB_NAME || 'food_website',
  process.env.DB_USER || 'food_user',
  process.env.DB_PASS || 'food_password',
  {
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: false,
  }
)

const { v4: uuidv4 } = require('uuid')

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  try {
    await sequelize.authenticate()
    console.log('✅ Database connected')

    const [recipes] = await sequelize.query(
      'SELECT id, title, category FROM recipes ORDER BY (COALESCE(viewCount,0)*0.3 + COALESCE(favoriteCount,0)*2) DESC'
    )
    console.log(`📊 ${recipes.length} recipes total`)

    const recipeMap = {}
    for (const r of recipes) {
      const key = r.title.trim()
      if (!recipeMap[key]) recipeMap[key] = []
      recipeMap[key].push(r)
    }

    let inserted = 0
    let skipped = 0

    for (const entry of VIDEO_MAP) {
      const candidates = recipeMap[entry.title]
      if (!candidates || candidates.length === 0) {
        console.log(`⚠️  Not found: "${entry.title}"`)
        skipped++
        continue
      }
      const recipe = candidates[0]

      for (const video of entry.videos) {
        const record = {
          id: uuidv4(),
          recipeId: recipe.id,
          videoUrl: video.url,
          platform: video.platform,
          title: video.title || null,
          duration: video.duration || null,
          sortOrder: video.sortOrder !== undefined ? video.sortOrder : 0,
        }

        if (dryRun) {
          console.log(`[DRY-RUN] ${recipe.title} → ${video.platform}: ${video.url}`)
        } else {
          try {
            await sequelize.query(
              `INSERT INTO video_embeds (id, recipeId, videoUrl, platform, title, duration, sortOrder, createdAt)
               VALUES (:id, :recipeId, :videoUrl, :platform, :title, :duration, :sortOrder, NOW())`,
              { replacements: record }
            )
            console.log(`✅ ${recipe.title} → ${video.platform}: ${video.title?.slice(0, 30) || video.url}`)
            inserted++
          } catch (err) {
            console.error(`❌ ${recipe.title} insert failed:`, err.message)
          }
        }
      }
    }

    if (dryRun) {
      console.log(`\n📋 DRY-RUN done: ${VIDEO_MAP.reduce((s, e) => s + e.videos.length, 0)} records total`)
    } else {
      console.log(`\n✅ Done! Inserted ${inserted}, skipped ${skipped} unmatched recipes`)
    }
  } catch (err) {
    console.error('❌ Script error:', err.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()