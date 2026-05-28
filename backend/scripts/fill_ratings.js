/**
 * scripts/fill_ratings.js
 * 为所有食谱生成真实的评分数据
 *
 * 评分分布原则：
 * - 热门食谱（高viewCount/favoriteCount）：评分多（10-18条），平均分高（4.2-4.8）
 * - 普通食谱：评分中等（3-10条），平均分中等（3.5-4.3）
 * - 冷门食谱：评分少（1-3条），可能出现低分（2-3星）
 *
 * 使用方式：
 *   node scripts/fill_ratings.js                         # 插入数据
 *   node scripts/fill_ratings.js --dry-run               # 只预览不插入
 *   node scripts/fill_ratings.js --clear-first           # 先清空旧评分再插入
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

// ── 评分模板 ───────────────────────────────────────────────
// 每道食谱根据流行度排名生成不同分数段和评论数的评分

const ratingComments = {
  5: [
    '非常棒！做出来家人抢着吃 😋',
    '太好吃了，已经做了无数次了',
    '五星好评，教程非常详细，新手也能成功',
    '这食谱太赞了，完全超出预期！',
    '味道绝了，饭店水准，以后不用出去吃了',
    '超级美味，朋友们都说好吃，多次被要食谱',
    '给孩子做的，吃得停不下来，谢谢分享',
    '完美！按照步骤做出来零失败',
    '这配方就是我要找的，味道特别正宗',
    '太好吃了，已经推荐给所有朋友了',
  ],
  4: [
    '不错，味道很好，就是有一点点咸',
    '挺好吃的，步骤详细，一次成功',
    '味道不错，比我想象中简单',
    '好吃！就是卖相没博主做得好哈哈',
    '不错的家常做法，全家都喜欢',
    '味道很好，还会再做，下次试试加辣椒',
    '简单易学，口感不错，推荐',
    '挺好的，一次就成功了，很有成就感',
    '色香味俱全，就是费了点时间',
    '好吃，已收藏，下次做给朋友尝尝',
  ],
  3: [
    '还行吧，味道中规中矩',
    '一般般，可能是我手艺问题',
    '还可以，不难吃但也不是很惊艳',
    '普通家常味道，没什么特别的',
    '步骤挺清楚的，但做出来味道一般',
    '三颗星，味道还可以但是有点油腻',
    '感觉缺了点什么，可能料不够全',
    '做法倒是简单，味道一般般吧',
    '不是很对我的口味，不过家人觉得还行',
    '还可以，下次调整一下配料试试',
  ],
  2: [
    '不太满意，味道偏淡了',
    '失败了，可能是火候没掌握好',
    '做出来跟图片差好多 😅',
    '味道一般，不会再做了',
    '不太推荐，有更好的做法',
    '步骤不够详细，有些地方没看懂',
    '太咸了，建议调整一下配料比例',
    '口感不好，不知道哪里出问题了',
  ],
  1: [
    '完全失败了，味道很奇怪',
    '不推荐，按照步骤做出来很难吃',
    '差评，浪费食材了',
    '教程有误，做出来完全不是那个味',
    '太难了，新手根本做不出来',
    '味道真不行，不会再试了',
  ],
}

// ── 国际美食专属评论文本（覆盖通用模板，按食谱标题匹配）──────
const taggedComments = {
  '法式马卡龙': {
    5: ['外壳酥脆内心柔软，比外面卖的还好吃！', '做了三次终于成功了，满满的成就感 ♥️', '完美的少女酥胸，配伯爵茶绝了',
        '法国的同事吃了都夸正宗，开心！', '减了10g糖依然很完美，推荐', '这个配方我收藏了，每个周末都做'],
    4: ['成功了！就是裙边还不够完美，继续练习', '味道很棒，但是有点太甜了，下次减糖试试',
        '还不错～室友说比烘焙店的好吃', '第一次做马卡龙，虽然有几个裂了但大部分成功'],
    3: ['烤出来口感还行，但是没有裙边，失败', '步骤挺详细，但是我做的太甜了',
        '马卡龙太难了，做出来不是很完美', '味道一般，可能是我的烤箱温度不准'],
  },
  '越南春卷': {
    5: ['清爽好吃，夏天必备！自己做的虾仁放超多', '朋友聚餐做了一大盘，秒光！', '晶莹剔透太漂亮了，蘸鱼露绝配',
        '家人都说比餐厅的好吃，开心', '放了芒果在里面，酸甜口感超赞'],
    4: ['不错，包的时候皮容易破，但味道很好', '清爽可口，就是米纸不太好操作',
        '蘸料是关键！按教程做了酸甜鱼露汁，好吃'],
    3: ['还行吧，包起来有点麻烦', '味道中规中矩，主要是蘸料', '做起来比想象中费时间'],
  },
  '越南牛肉粉': {
    5: ['熬了一整夜的牛骨汤，值得！', '河粉Q弹汤头鲜美，跟越南吃的一样', '这个汤底配方太经典了，加点九层塔完美',
        '在越南学到的味道，居然在家复刻了！', '汤头清澈浓郁，牛肉薄片烫一下刚刚好'],
    4: ['不错，汤头再熬久一点会更好', '味道很不错就是牛肉切得不够薄',
        '河粉买对了牌子就成功了一半，味道好'],
    3: ['味道还行，但是比不上外面卖的', '汤头有点淡，可能是我熬的时间不够'],
  },
  '印度黄油鸡': {
    5: ['咖喱太浓郁了，配馕饼吃了三块！', '这配方绝了，奶油和黄油的黄金比例', '跟印度餐厅一个味，以后不用外卖了',
        '孩子们超爱吃，拌米饭能吃两碗', '加了点辣椒粉更符合中国口味，超赞'],
    4: ['味道很好，就是准备香料稍微麻烦', '好吃的，咖喱味很浓，下次多加辣',
        '味道很不错，配上馕饼完美一餐'],
    3: ['还不错，但是少了印度餐厅那种烟熏味', '味道可以，感觉还差一点点层次感'],
  },
  '印度烤饼': {
    5: ['没有坦都炉也能做出这么香的馕饼！', '外酥里软，搭配黄油鸡绝了', '面团的发酵时间掌握好，非常成功',
        '一下子做了6个，全家人抢着吃', '加了大蒜和黄油的馕饼比餐厅还好吃'],
    4: ['不错，稍微有点厚，但味道很棒', '很香！就是煎的时候火候不好掌握',
        '挺成功的，下次做芝士口味试试'],
    3: ['还行，就是没有外面那种焦香', '口感还可以，但对我来说有点油'],
  },
  '希腊沙拉': {
    5: ['夏天吃这个太清爽了！Feta奶酪是灵魂', '新鲜食材配上橄榄油，简单又美味',
        '去希腊旅游后一直想念的味道，终于吃到了', '健康又好吃，减脂期完美选择'],
    4: ['味道不错，就是Feta不太好买，换成了别的奶酪', '清爽好吃，黑橄榄点睛之笔',
        '食材新鲜就没问题，好吃'],
    3: ['一般吧，就是蔬菜沙拉加奶酪', '味道可以但不太适合中国胃'],
  },
  '鹰嘴豆泥': {
    5: ['丝滑浓郁，比超市买的好吃一百倍', '配上烤馕饼太完美了，已经做了三次',
        '加了孜然和辣椒粉，微微辣超好吃', '健康美味的蛋白质来源，健身必备'],
    4: ['很顺滑，就是芝麻酱要多放点才香', '味道不错，下次加点松子装饰'],
    3: ['还行，感觉少了点什么', '味道可以但口感不够细腻'],
  },
  '西班牙海鲜饭': {
    5: ['藏红花是灵魂！做出了巴塞罗那的味道', '海鲜放超多，朋友们都惊呆了', '锅底的锅巴最好吃，照片发了朋友圈被狂赞',
        'Paella配白葡萄酒，完美周末', '这道菜费时间但绝对值得！'],
    4: ['味道很赞，就是锅巴有点糊了哈哈', '海鲜的鲜味和米饭融合得很好',
        '做了一大锅，家人都说好吃'],
    3: ['味道还行吧，工序太复杂', '还可以，但是藏红花太贵了用姜黄替代了'],
  },
  '墨西哥塔可': {
    5: ['自助Taco party太欢乐了！朋友自己加料', '玉米饼烤一下更香，牛肉馅料太棒了',
        '配料丰富口味层次感十足，赞！', '自己做的料比外面足多了，Salsa也超新鲜'],
    4: ['好吃！就是包起来容易漏，要多练习', '味道不错，牛油果酱和塔可太配了',
        '很有趣的一餐，适合朋友聚会'],
    3: ['味道一般，主要是吃个新鲜', '还可以但是饼皮有点硬'],
  },
  '牛油果酱': {
    5: ['牛油果要熟透才能做出丝滑的Guac！', '加了番茄丁和洋葱，口感超丰富',
        '配玉米片追剧神器，做了一大碗全吃光', '比Chipotle的牛油果酱还好吃！'],
    4: ['好吃，就是牛油果要选好，不然容易黑', '味道不错，挤点青柠汁更清爽'],
    3: ['还行，牛油果熟了就好吃', '感觉加点辣椒粉更好'],
  },
  '墨西哥玉米卷饼': {
    5: ['馅料丰富，芝士拉丝太诱人了', '做了超大一份，全家都吃撑了', '这个比塔可更管饱，好吃！',
        '鸡肉馅的嫩滑多汁，配上酸奶油绝了'],
    4: ['好吃！就是卷的时候有点难度', '味道很赞，馅料可以自己发挥创意'],
    3: ['还可以，但感觉芝士放少了', '味道中规中矩，没啥惊喜'],
  },
  '日式舒芙蕾芝士蛋糕': {
    5: ['入口即化！比棉花糖还轻盈', 'duang duang的超Q弹，成功的那一刻太开心了',
        '冷藏后更好吃！配黑咖啡完美', '做了不下五次了，这个方子最靠谱'],
    4: ['好吃！就是蛋糕塌了一点点，应该是蛋白没打好', '口感很轻盈，芝士味浓郁',
        '成功！就是切的时候要热刀不然会粘'],
    3: ['口感不错但是有点蛋腥味', '烘焙难度有点高，做出来塌了'],
  },
  '水煮鱼（改编）': {
    5: ['改编版更符合家庭操作，超级下饭！', '麻辣鲜香，鱼肉嫩滑，完美', '自己片鱼片其实不难，配上豆芽超赞',
        '比饭店的还好吃，麻辣度刚刚好'],
    4: ['味道很好，就是油有点大', '够辣！下次少放点花椒更好'],
    3: ['还行，没有原版水煮鱼过瘾', '味道一般，缺了点层次'],
  },
}

// ── 评分分布引擎 ───────────────────────────────────────────
function generateRatings(popularity, recipeTitle, recipeId, adminId, secondUserId) {
  // popularity: 0=冷门, 1=普通, 2=热门
  let count, avgTarget, spread

  switch (popularity) {
    case 'hot':
      count = 10 + Math.floor(Math.random() * 9) // 10-18
      avgTarget = 4.2 + Math.random() * 0.6 // 4.2-4.8
      spread = 0.8
      break
    case 'normal':
      count = 3 + Math.floor(Math.random() * 8) // 3-10
      avgTarget = 3.5 + Math.random() * 0.8 // 3.5-4.3
      spread = 1.0
      break
    case 'cold':
    default:
      count = 1 + Math.floor(Math.random() * 3) // 1-3
      avgTarget = 2.5 + Math.random() * 1.0 // 2.5-3.5
      spread = 1.2
      break
  }

  const userIDs = [adminId]
  if (secondUserId) userIDs.push(secondUserId)

  // 生成评分，使最终均值接近 avgTarget
  let ratings = []
  const attempts = 0
  while (ratings.length < count && attempts < 1000) {
    // 用正态近似生成
    let r = Math.round(avgTarget + (Math.random() - 0.5) * spread * 2)
    r = Math.max(1, Math.min(5, r))
    ratings.push(r)
  }

  // 保证每道食谱至少有一条五星评价（如果是热门/普通）
  if (popularity !== 'cold' && !ratings.some(r => r === 5)) {
    ratings[0] = 5
  }

  // 保证至少一条1-3星（避免全是满分）
  if (!ratings.some(r => r <= 3)) {
    ratings[ratings.length - 1] = 2 + Math.floor(Math.random() * 2)
  }

  // 实际数量微调
  ratings = ratings.slice(0, count)

  // 打乱顺序
  for (let i = ratings.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ratings[i], ratings[j]] = [ratings[j], ratings[i]]
  }

  // 生成带日期的评论记录
  const records = []
  const now = new Date()
  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i]
    // 优先使用国际美食专属评论（按食谱标题匹配）
    const tagged = taggedComments[recipeTitle]
    const commentPool = (tagged && tagged[rating]) ? tagged[rating] : (ratingComments[rating] || ratingComments[3])
    const comment = commentPool[Math.floor(Math.random() * commentPool.length)]
    const userId = userIDs[Math.floor(Math.random() * userIDs.length)]

    // 日期从30天前到现在随机分布
    const daysAgo = Math.floor(Math.random() * 30)
    const date = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000))

    records.push({
      content: comment,
      rating,
      userId,
      recipeId,
      likesCount: Math.floor(Math.random() * 20),
      createdAt: date.toISOString().replace('T', ' ').slice(0, 19),
    })
  }

  return records
}

// ── 主逻辑 ─────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const clearFirst = process.argv.includes('--clear-first')

  const { Sequelize } = require('sequelize')

  const dbConfig = {
    host: process.env.DB_HOST || '172.17.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'food_website',
    username: process.env.DB_USER || 'food_user',
    password: process.env.DB_PASS || 'food_password',
    dialect: 'mysql',
  }

  const sequelize = new Sequelize(dbConfig)

  try {
    await sequelize.authenticate()
    console.log('✅ 数据库连接成功')

    // 获取用户ID
    const [users] = await sequelize.query('SELECT id, username FROM users')
    const adminId = users.find(u => u.username === 'admin')?.id
    const secondId = users.find(u => u.username !== 'admin')?.id
    console.log(`👤 管理员: ${adminId?.slice(0, 8)}... ${secondId ? `其他: ${secondId.slice(0, 8)}...` : '无'}`)

    if (!adminId) {
      console.error('❌ 未找到管理员用户')
      process.exit(1)
    }

    // 获取食谱按流行度排序
    const [rawRecipes] = await sequelize.query(
      'SELECT id, title, category, viewCount, favoriteCount FROM recipes ORDER BY (COALESCE(viewCount,0)*0.3 + COALESCE(favoriteCount,0)*2) DESC'
    )
    console.log(`📊 共 ${rawRecipes.length} 道食谱`)

    // 分为热门(30%)、普通(40%)、冷门(30%)
    const total = rawRecipes.length
    const hotCount = Math.ceil(total * 0.3)
    const normalCount = Math.ceil(total * 0.4)

    const recipes = rawRecipes.map((r, i) => ({
      ...r,
      popularity: i < hotCount ? 'hot' : i < hotCount + normalCount ? 'normal' : 'cold',
    }))

    // 统计
    const popCount = { hot: 0, normal: 0, cold: 0 }
    recipes.forEach(r => popCount[r.popularity]++)
    console.log(`📊 热门: ${popCount.hot}, 普通: ${popCount.normal}, 冷门: ${popCount.cold}`)

    // 清空旧数据
    if (clearFirst && !dryRun) {
      console.log('🧹 清空旧评论和评分数据...')
      await sequelize.query('DELETE FROM comments')
      await sequelize.query('UPDATE recipes SET avgRating=0, ratingCount=0')
      console.log('✅ 旧数据已清空')
    }

    // 生成评分数据
    let allRecords = []
    const recipeStats = []

    for (const recipe of recipes) {
      const records = generateRatings(recipe.popularity, recipe.title, recipe.id, adminId, secondId)
      allRecords = allRecords.concat(records)

      const sum = records.reduce((s, r) => s + r.rating, 0)
      recipeStats.push({
        id: recipe.id,
        title: recipe.title,
        popularity: recipe.popularity,
        count: records.length,
        avg: sum / records.length,
      })

      if (dryRun) {
        const stars = '⭐'.repeat(Math.round(sum / records.length))
        console.log(`  [${recipe.popularity}] ${recipe.title.slice(0, 12)}: ${records.length}条, 均分${(sum / records.length).toFixed(1)}${stars}`)
      }
    }

    if (dryRun) {
      console.log(`\n📋 DRY-RUN 完成，共 ${allRecords.length} 条待插入`)
      const ratingDist = {}
      allRecords.forEach(r => { ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1 })
      console.log('评分分布:', Object.entries(ratingDist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}星:${v}条`).join(', '))
      return
    }

    // 批量插入评论
    console.log(`\n🔄 正在插入 ${allRecords.length} 条评论...`)
    const BATCH = 50
    for (let i = 0; i < allRecords.length; i += BATCH) {
      const batch = allRecords.slice(i, i + BATCH)
      const values = batch.map(r =>
        `('${r.content.replace(/'/g, "\\'")}', ${r.rating}, '${r.userId}', '${r.recipeId}', ${r.likesCount}, '${r.createdAt}')`
      ).join(',\n')
      try {
        await sequelize.query(
          `INSERT INTO comments (content, rating, userId, recipeId, likesCount, createdAt) VALUES ${values}`
        )
      } catch (err) {
        console.error(`❌ 批次 ${i}-${i + BATCH} 插入失败:`, err.message)
      }
      if ((i / BATCH) % 4 === 0) process.stdout.write('.')
    }
    console.log('\n✅ 评论插入完成')

    // 更新每道食谱的 avgRating 和 ratingCount
    console.log('🔄 更新食谱评分统计...')
    let updated = 0
    for (const stat of recipeStats) {
      const [rows] = await sequelize.query(
        `UPDATE recipes SET avgRating=${stat.avg.toFixed(2)}, ratingCount=${stat.count} WHERE id='${stat.id}'`
      )
      if (rows.affectedRows > 0) updated++
    }
    console.log(`✅ 更新了 ${updated}/${recipeStats.length} 道食谱的评分统计`)

    // 打印最终统计
    const [result] = await sequelize.query(
      "SELECT COUNT(*) AS withRatings, AVG(avgRating) AS avgAvg FROM recipes WHERE ratingCount > 0"
    )
    console.log(`\n📊 最终统计:`)
    console.log(`  有评分食谱: ${result[0].withRatings}`)
    console.log(`  平均评分: ${parseFloat(result[0].avgAvg || 0).toFixed(2)}`)
    console.log(`  总评论数: ${allRecords.length}`)

  } catch (err) {
    console.error('❌ 脚本执行失败:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

main()