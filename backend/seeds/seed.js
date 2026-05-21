'use strict'

/**
 * seeds/seed.js
 * 示范食谱数据生成器
 *
 * 运行方式：
 *   cd backend && node seeds/seed.js
 */

const { v4: uuidv4 } = require('uuid')
const db = require('../models')

const recipes = [
  {
    id: uuidv4(),
    title: '宫保鸡丁',
    coverImage: 'https://placehold.co/400x300/E74C3C/white?text=宫保鸡丁',
    author: '美食达人',
    cookTime: 25,
    description: '经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香，是一道老少皆宜的家常菜。',
    category: 'chinese',
    difficulty: 'medium',
    servings: 3,
    ingredients: JSON.stringify([
      { name: '鸡胸肉', amount: 300, unit: 'g' },
      { name: '花生米', amount: 50, unit: 'g' },
      { name: '干辣椒', amount: 10, unit: '个' },
      { name: '花椒', amount: 1, unit: '勺' },
      { name: '葱姜蒜', amount: 15, unit: 'g' },
      { name: '生抽', amount: 2, unit: '勺' },
      { name: '醋', amount: 1, unit: '勺' },
      { name: '糖', amount: 1, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '鸡胸肉切丁，用料酒、生抽、淀粉腌制15分钟' },
      { stepNumber: 2, content: '花生米小火炒至金黄，盛出备用' },
      { stepNumber: 3, content: '调汁：生抽2勺、醋1勺、糖1勺、淀粉适量，加少许水搅匀' },
      { stepNumber: 4, content: '热锅冷油，下鸡丁滑炒至变色盛出' },
      { stepNumber: 5, content: '锅中留底油，爆香干辣椒、花椒、葱姜蒜' },
      { stepNumber: 6, content: '倒入鸡丁和花生米翻炒，淋入调好的酱汁' },
      { stepNumber: 7, content: '大火收汁，撒上葱花出锅' }
    ])
  },
  {
    id: uuidv4(),
    title: '红烧肉',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=红烧肉',
    author: '家常菜师傅',
    cookTime: 90,
    description: '肥而不腻、入口即化的经典红烧肉，浓油赤酱，是下饭的绝佳选择。',
    category: 'chinese',
    difficulty: 'medium',
    servings: 4,
    ingredients: JSON.stringify([
      { name: '五花肉', amount: 500, unit: 'g' },
      { name: '冰糖', amount: 30, unit: 'g' },
      { name: '八角', amount: 2, unit: '个' },
      { name: '桂皮', amount: 1, unit: '块' },
      { name: '生抽', amount: 3, unit: '勺' },
      { name: '老抽', amount: 1, unit: '勺' },
      { name: '料酒', amount: 2, unit: '勺' },
      { name: '姜', amount: 3, unit: '片' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '五花肉切3厘米方块，冷水下锅焯水去血沫' },
      { stepNumber: 2, content: '捞出洗净，沥干水分' },
      { stepNumber: 3, content: '锅中放少许油，下冰糖小火炒至焦糖色' },
      { stepNumber: 4, content: '放入五花肉翻炒上色' },
      { stepNumber: 5, content: '加入八角、桂皮、姜片、料酒、生抽、老抽' },
      { stepNumber: 6, content: '加热水没过肉块，大火烧开转小火炖60分钟' },
      { stepNumber: 7, content: '大火收汁，待汤汁浓稠即可出锅' }
    ])
  },
  {
    id: uuidv4(),
    title: '番茄意面',
    coverImage: 'https://placehold.co/400x300/FF6347/white?text=番茄意面',
    author: '西餐爱好者',
    cookTime: 20,
    description: '经典的意大利面做法，酸甜可口的番茄酱汁搭配弹牙的意面，简单又美味。',
    category: 'western',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '意大利面', amount: 200, unit: 'g' },
      { name: '番茄', amount: 3, unit: '个' },
      { name: '蒜', amount: 3, unit: '瓣' },
      { name: '洋葱', amount: 1, unit: '个' },
      { name: '橄榄油', amount: 2, unit: '勺' },
      { name: '番茄酱', amount: 3, unit: '勺' },
      { name: '盐', amount: 1, unit: '茶匙' },
      { name: '黑胡椒', amount: 1, unit: '茶匙' },
      { name: '帕玛森芝士', amount: 20, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '大锅烧水，加盐，下意面煮8-10分钟至弹牙' },
      { stepNumber: 2, content: '番茄划十字，开水烫后去皮切碎' },
      { stepNumber: 3, content: '平底锅倒橄榄油，爆香蒜末和洋葱丁' },
      { stepNumber: 4, content: '倒入番茄碎和番茄酱，小火熬煮10分钟' },
      { stepNumber: 5, content: '加盐和黑胡椒调味' },
      { stepNumber: 6, content: '将煮好的意面拌入酱汁，撒上芝士碎即可' }
    ])
  },
  {
    id: uuidv4(),
    title: '法式焗蜗牛',
    coverImage: 'https://placehold.co/400x300/DC143C/white?text=法式焗蜗牛',
    author: '法餐大厨',
    cookTime: 45,
    description: '经典法式前菜，蜗牛搭配蒜香黄油和欧芹，口感独特，风味浓郁。',
    category: 'western',
    difficulty: 'hard',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '蜗牛罐头', amount: 24, unit: '只' },
      { name: '黄油', amount: 100, unit: 'g' },
      { name: '蒜', amount: 4, unit: '瓣' },
      { name: '欧芹', amount: 20, unit: 'g' },
      { name: '白葡萄酒', amount: 50, unit: 'ml' },
      { name: '盐', amount: 1, unit: '茶匙' },
      { name: '黑胡椒', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '黄油软化，加入蒜末、欧芹碎、盐和胡椒拌匀' },
      { stepNumber: 2, content: '蜗牛洗净沥干，用白葡萄酒腌制10分钟' },
      { stepNumber: 3, content: '将蜗牛放入专用焗盘，每个蜗牛孔填入蒜香黄油' },
      { stepNumber: 4, content: '烤箱预热200°C，焗10-12分钟至黄油融化冒泡' },
      { stepNumber: 5, content: '取出搭配法棍面包食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '提拉米苏',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=提拉米苏',
    author: '甜点大师',
    cookTime: 30,
    description: '来自意大利的经典甜点，马斯卡彭芝士与浓缩咖啡的完美结合，入口即化。',
    category: 'dessert',
    difficulty: 'medium',
    servings: 6,
    ingredients: JSON.stringify([
      { name: '马斯卡彭芝士', amount: 250, unit: 'g' },
      { name: '手指饼干', amount: 200, unit: 'g' },
      { name: '浓缩咖啡', amount: 200, unit: 'ml' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '糖', amount: 80, unit: 'g' },
      { name: '可可粉', amount: 20, unit: 'g' },
      { name: '朗姆酒', amount: 2, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '蛋黄加糖打至浓稠发白' },
      { stepNumber: 2, content: '加入马斯卡彭芝士搅拌均匀' },
      { stepNumber: 3, content: '蛋白打发至硬性发泡，轻轻拌入芝士糊' },
      { stepNumber: 4, content: '浓缩咖啡冷却，加入朗姆酒' },
      { stepNumber: 5, content: '手指饼干快速蘸咖啡液，铺满容器底部' },
      { stepNumber: 6, content: '铺一层芝士糊，再铺一层蘸咖啡的饼干' },
      { stepNumber: 7, content: '重复层叠，最后盖上芝士糊' },
      { stepNumber: 8, content: '冷藏4小时以上，食用前筛上可可粉' }
    ])
  },
  {
    id: uuidv4(),
    title: '抹茶千层蛋糕',
    coverImage: 'https://placehold.co/400x300/2E8B57/white?text=抹茶千层',
    author: '日式甜点屋',
    cookTime: 60,
    description: '细腻的抹茶可丽饼层层叠加，搭配丝滑奶油，日式甜点的经典之作。',
    category: 'japanese',
    difficulty: 'hard',
    servings: 8,
    ingredients: JSON.stringify([
      { name: '低筋面粉', amount: 100, unit: 'g' },
      { name: '抹茶粉', amount: 15, unit: 'g' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '牛奶', amount: 400, unit: 'ml' },
      { name: '黄油', amount: 30, unit: 'g' },
      { name: '糖', amount: 60, unit: 'g' },
      { name: '淡奶油', amount: 400, unit: 'ml' },
      { name: '糖粉', amount: 30, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '面粉和抹茶粉过筛混合' },
      { stepNumber: 2, content: '鸡蛋加糖打散，慢慢倒入牛奶搅拌均匀' },
      { stepNumber: 3, content: '将液体分次倒入粉类，搅拌至无颗粒' },
      { stepNumber: 4, content: '加入融化黄油搅匀，过滤面糊，冷藏30分钟' },
      { stepNumber: 5, content: '小火摊薄饼皮，约可做20张' },
      { stepNumber: 6, content: '淡奶油加糖粉打至硬性发泡' },
      { stepNumber: 7, content: '一层饼皮一层奶油叠放' },
      { stepNumber: 8, content: '冷藏2小时定型后切块食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '韩式拌饭',
    coverImage: 'https://placehold.co/400x300/FF4500/white?text=韩式拌饭',
    author: '韩国料理王',
    cookTime: 35,
    description: '色彩缤纷的韩式经典料理，多种蔬菜搭配米饭和辣酱，营养均衡又美味。',
    category: 'korean',
    difficulty: 'medium',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '米饭', amount: 300, unit: 'g' },
      { name: '牛肉', amount: 100, unit: 'g' },
      { name: '菠菜', amount: 100, unit: 'g' },
      { name: '胡萝卜', amount: 1, unit: '根' },
      { name: '豆芽', amount: 100, unit: 'g' },
      { name: '鸡蛋', amount: 1, unit: '个' },
      { name: '韩式辣酱', amount: 2, unit: '勺' },
      { name: '芝麻油', amount: 1, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '牛肉切丝，用酱油、糖、芝麻油腌制' },
      { stepNumber: 2, content: '菠菜焯水，拌入盐和芝麻油' },
      { stepNumber: 3, content: '胡萝卜切丝炒熟，豆芽焯水沥干' },
      { stepNumber: 4, content: '牛肉炒熟备用' },
      { stepNumber: 5, content: '煎一个太阳蛋' },
      { stepNumber: 6, content: '碗中盛米饭，将各种蔬菜和牛肉围着摆放' },
      { stepNumber: 7, content: '中间放煎蛋，搭配韩式辣酱拌匀食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '麻婆豆腐',
    coverImage: 'https://placehold.co/400x300/CC0000/white?text=麻婆豆腐',
    author: '川菜小馆',
    cookTime: 15,
    description: '麻辣鲜香的经典川菜，嫩豆腐搭配肉末和花椒，简单快手却味道十足。',
    category: 'chinese',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '嫩豆腐', amount: 1, unit: '盒' },
      { name: '猪肉末', amount: 50, unit: 'g' },
      { name: '豆瓣酱', amount: 1, unit: '勺' },
      { name: '花椒粉', amount: 1, unit: '茶匙' },
      { name: '蒜末', amount: 1, unit: '勺' },
      { name: '葱花', amount: 10, unit: 'g' },
      { name: '水淀粉', amount: 2, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '豆腐切2厘米方块，开水加盐焯2分钟' },
      { stepNumber: 2, content: '热锅冷油，下肉末炒至变色' },
      { stepNumber: 3, content: '加入豆瓣酱炒出红油' },
      { stepNumber: 4, content: '加适量水烧开，轻轻放入豆腐块' },
      { stepNumber: 5, content: '中火煮3分钟入味' },
      { stepNumber: 6, content: '淋入水淀粉勾芡，撒花椒粉和葱花' }
    ])
  },
  {
    id: uuidv4(),
    title: '味噌拉面',
    coverImage: 'https://placehold.co/400x300/8B4513/white?text=味噌拉面',
    author: '日式拉面馆',
    cookTime: 40,
    description: '浓郁味噌汤底搭配弹牙拉面，配上溏心蛋和叉烧，冬日暖身首选。',
    category: 'japanese',
    difficulty: 'medium',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '拉面', amount: 200, unit: 'g' },
      { name: '味噌', amount: 3, unit: '勺' },
      { name: '猪骨汤', amount: 800, unit: 'ml' },
      { name: '叉烧肉', amount: 100, unit: 'g' },
      { name: '溏心蛋', amount: 2, unit: '个' },
      { name: '玉米粒', amount: 50, unit: 'g' },
      { name: '黄油', amount: 10, unit: 'g' },
      { name: '葱花', amount: 10, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '猪骨汤加热至微沸' },
      { stepNumber: 2, content: '味噌用少量热汤化开，倒入汤中搅匀' },
      { stepNumber: 3, content: '另一锅煮面至弹牙，捞出放入碗中' },
      { stepNumber: 4, content: '汤中加一小块黄油增香' },
      { stepNumber: 5, content: '将味噌汤浇入面碗' },
      { stepNumber: 6, content: '摆上切好的叉烧、溏心蛋、玉米粒和葱花' }
    ])
  },
  {
    id: uuidv4(),
    title: '法式焦糖布丁',
    coverImage: 'https://placehold.co/400x300/DAA520/white?text=焦糖布丁',
    author: '甜点师小天',
    cookTime: 60,
    description: '经典法式甜点，焦糖的微苦与蛋奶的香甜交织，口感丝滑细腻。',
    category: 'dessert',
    difficulty: 'medium',
    servings: 4,
    ingredients: JSON.stringify([
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '牛奶', amount: 300, unit: 'ml' },
      { name: '淡奶油', amount: 100, unit: 'ml' },
      { name: '糖', amount: 80, unit: 'g' },
      { name: '香草精', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '50g糖加水小火熬至琥珀色焦糖' },
      { stepNumber: 2, content: '焦糖迅速倒入布丁模具底部' },
      { stepNumber: 3, content: '牛奶和淡奶油加热至微沸' },
      { stepNumber: 4, content: '鸡蛋加剩余糖打散至融化' },
      { stepNumber: 5, content: '热牛奶缓慢倒入蛋液，边倒边搅' },
      { stepNumber: 6, content: '过滤蛋奶液，加入香草精' },
      { stepNumber: 7, content: '倒入模具，水浴法150°C烤40分钟' },
      { stepNumber: 8, content: '冷却后冷藏4小时，脱模食用' }
    ])
  }
]

async function seed () {
  try {
    await db.sequelize.sync()

    // 清空旧数据
    await db.Favorite.destroy({ where: {} })
    await db.Recipe.destroy({ where: {} })

    // 插入新数据
    await db.Recipe.bulkCreate(recipes)

    console.log(`✅ 成功插入 ${recipes.length} 条示范食谱`)
    console.log(`   分类分布: ${[...new Set(recipes.map(r => r.category))].join(', ')}`)

    process.exit(0)
  } catch (err) {
    console.error('❌ 种子数据插入失败:', err.message)
    process.exit(1)
  }
}

seed()