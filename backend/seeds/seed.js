'use strict'

/**
 * seeds/seed.js
 * 示范食谱数据生成器
 *
 * 运行方式：
 *   cd backend && node seeds/seed.js
 */

const { v4: uuidv4 } = require('uuid')
const bcrypt = require('bcryptjs')
const db = require('../models')

const recipes = [
  {
    id: uuidv4(),
    title: '宫保鸡丁',
    coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 25,
    description: '经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香，是一道老少皆宜的家常菜。',
    category: 'chinese',
    difficulty: 'medium',
    season: 'all',
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
    coverImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    author: '家常菜师傅',
    cookTime: 90,
    description: '肥而不腻、入口即化的经典红烧肉，浓油赤酱，是下饭的绝佳选择。',
    category: 'chinese',
    difficulty: 'medium',
    season: 'autumn',
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
    coverImage: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
    author: '西餐爱好者',
    cookTime: 20,
    description: '经典的意大利面做法，酸甜可口的番茄酱汁搭配弹牙的意面，简单又美味。',
    category: 'western',
    difficulty: 'easy',
    season: 'summer',
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
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
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
    coverImage: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
    author: '甜点大师',
    cookTime: 30,
    description: '来自意大利的经典甜点，马斯卡彭芝士与浓缩咖啡的完美结合，入口即化。',
    category: 'dessert',
    difficulty: 'medium',
    season: 'all',
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
    coverImage: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&h=300&fit=crop',
    author: '日式甜点屋',
    cookTime: 60,
    description: '细腻的抹茶可丽饼层层叠加，搭配丝滑奶油，日式甜点的经典之作。',
    category: 'japanese',
    difficulty: 'hard',
    season: 'spring',
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
    coverImage: 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400&h=300&fit=crop',
    author: '韩国料理王',
    cookTime: 35,
    description: '色彩缤纷的韩式经典料理，多种蔬菜搭配米饭和辣酱，营养均衡又美味。',
    category: 'korean',
    difficulty: 'medium',
    season: 'all',
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
    coverImage: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400&h=300&fit=crop',
    author: '川菜小馆',
    cookTime: 15,
    description: '麻辣鲜香的经典川菜，嫩豆腐搭配肉末和花椒，简单快手却味道十足。',
    category: 'chinese',
    difficulty: 'easy',
    season: 'winter',
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
    coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
    author: '日式拉面馆',
    cookTime: 40,
    description: '浓郁味噌汤底搭配弹牙拉面，配上溏心蛋和叉烧，冬日暖身首选。',
    category: 'japanese',
    difficulty: 'medium',
    season: 'winter',
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
    coverImage: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    author: '甜点师小天',
    cookTime: 60,
    description: '经典法式甜点，焦糖的微苦与蛋奶的香甜交织，口感丝滑细腻。',
    category: 'dessert',
    difficulty: 'medium',
    season: 'all',
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
  },

  // ── 新增食谱：扩充分类覆盖 ──

  // 中餐补充
  {
    id: uuidv4(),
    title: '鱼香肉丝',
    coverImage: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop',
    author: '川味厨房',
    cookTime: 20,
    description: '酸甜微辣的经典川菜，肉丝嫩滑，配菜爽脆，鱼香汁浓郁下饭。',
    category: 'chinese',
    difficulty: 'medium',
    season: 'all',
    servings: 3,
    ingredients: JSON.stringify([
      { name: '猪里脊肉', amount: 250, unit: 'g' },
      { name: '木耳', amount: 50, unit: 'g' },
      { name: '胡萝卜', amount: 1, unit: '根' },
      { name: '青椒', amount: 1, unit: '个' },
      { name: '泡椒', amount: 3, unit: '个' },
      { name: '葱姜蒜', amount: 15, unit: 'g' },
      { name: '醋', amount: 2, unit: '勺' },
      { name: '糖', amount: 2, unit: '勺' },
      { name: '生抽', amount: 2, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '猪里脊切丝，用料酒、生抽、淀粉腌制10分钟' },
      { stepNumber: 2, content: '木耳泡发切丝，胡萝卜、青椒切丝' },
      { stepNumber: 3, content: '调鱼香汁：醋2勺、糖2勺、生抽2勺、淀粉1勺、水适量搅匀' },
      { stepNumber: 4, content: '热锅冷油，下肉丝滑炒至变色盛出' },
      { stepNumber: 5, content: '锅中留底油，爆香泡椒、葱姜蒜' },
      { stepNumber: 6, content: '下配菜翻炒至断生' },
      { stepNumber: 7, content: '倒入肉丝和鱼香汁，大火翻炒均匀即可' }
    ])
  },
  {
    id: uuidv4(),
    title: '糖醋排骨',
    coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
    author: '家常菜师傅',
    cookTime: 40,
    description: '色泽红亮、酸甜适口的经典家常菜，外酥里嫩，大人小孩都爱吃。',
    category: 'chinese',
    difficulty: 'medium',
    season: 'autumn',
    servings: 3,
    ingredients: JSON.stringify([
      { name: '小排', amount: 500, unit: 'g' },
      { name: '醋', amount: 3, unit: '勺' },
      { name: '糖', amount: 3, unit: '勺' },
      { name: '生抽', amount: 2, unit: '勺' },
      { name: '料酒', amount: 2, unit: '勺' },
      { name: '姜', amount: 3, unit: '片' },
      { name: '白芝麻', amount: 5, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '小排冷水下锅焯水，捞出洗净' },
      { stepNumber: 2, content: '锅中放油，下排骨煎至两面金黄' },
      { stepNumber: 3, content: '加入姜片、料酒、生抽翻炒上色' },
      { stepNumber: 4, content: '加热水没过排骨，大火烧开转小火炖25分钟' },
      { stepNumber: 5, content: '加入醋和糖，大火收汁至浓稠' },
      { stepNumber: 6, content: '撒上白芝麻出锅' }
    ])
  },
  {
    id: uuidv4(),
    title: '水煮牛肉',
    coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    author: '川菜小馆',
    cookTime: 30,
    description: '麻辣鲜香的川菜经典，牛肉嫩滑入味，汤底红亮，辣而不燥。',
    category: 'chinese',
    difficulty: 'hard',
    season: 'winter',
    servings: 3,
    ingredients: JSON.stringify([
      { name: '牛里脊', amount: 300, unit: 'g' },
      { name: '豆芽', amount: 200, unit: 'g' },
      { name: '郫县豆瓣酱', amount: 2, unit: '勺' },
      { name: '干辣椒', amount: 15, unit: '个' },
      { name: '花椒', amount: 2, unit: '勺' },
      { name: '蒜末', amount: 2, unit: '勺' },
      { name: '生抽', amount: 2, unit: '勺' },
      { name: '淀粉', amount: 1, unit: '勺' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '牛里脊逆纹切薄片，用蛋清、淀粉、料酒腌制15分钟' },
      { stepNumber: 2, content: '豆芽焯水铺在碗底' },
      { stepNumber: 3, content: '热锅冷油，下豆瓣酱炒出红油，加蒜末爆香' },
      { stepNumber: 4, content: '加水烧开，下牛肉片滑散煮至变色' },
      { stepNumber: 5, content: '将牛肉和汤汁倒在豆芽上' },
      { stepNumber: 6, content: '另起锅烧热油，下干辣椒和花椒炸香' },
      { stepNumber: 7, content: '将热油浇在牛肉上，滋啦一声即成' }
    ])
  },
  {
    id: uuidv4(),
    title: '清蒸鲈鱼',
    coverImage: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
    author: '粤菜大厨',
    cookTime: 20,
    description: '原汁原味的粤式经典，鱼肉鲜嫩，豉油提味，清淡而不寡淡。',
    category: 'chinese',
    difficulty: 'easy',
    season: 'spring',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '鲈鱼', amount: 1, unit: '条' },
      { name: '葱', amount: 3, unit: '根' },
      { name: '姜', amount: 5, unit: '片' },
      { name: '蒸鱼豉油', amount: 3, unit: '勺' },
      { name: '料酒', amount: 1, unit: '勺' },
      { name: '红椒丝', amount: 10, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '鲈鱼处理干净，两面各划三刀' },
      { stepNumber: 2, content: '鱼身抹料酒，塞入姜片，腌制10分钟' },
      { stepNumber: 3, content: '盘底铺葱段和姜片，放上鱼' },
      { stepNumber: 4, content: '水开后上锅大火蒸8分钟，关火焖2分钟' },
      { stepNumber: 5, content: '倒掉盘中蒸汁，铺上葱丝和红椒丝' },
      { stepNumber: 6, content: '淋上蒸鱼豉油，浇上一勺热油激香' }
    ])
  },

  // 西餐补充
  {
    id: uuidv4(),
    title: '凯撒沙拉',
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    author: '西餐爱好者',
    cookTime: 15,
    description: '经典西式沙拉，生菜爽脆，面包丁酥香，凯撒酱浓郁丝滑。',
    category: 'western',
    difficulty: 'easy',
    season: 'summer',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '罗马生菜', amount: 1, unit: '颗' },
      { name: '面包丁', amount: 50, unit: 'g' },
      { name: '帕玛森芝士', amount: 30, unit: 'g' },
      { name: '橄榄油', amount: 3, unit: '勺' },
      { name: '柠檬汁', amount: 1, unit: '勺' },
      { name: '蒜', amount: 1, unit: '瓣' },
      { name: '蛋黄酱', amount: 2, unit: '勺' },
      { name: '黑胡椒', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '罗马生菜洗净沥干，撕成大片' },
      { stepNumber: 2, content: '面包切丁，橄榄油拌匀后烤至金黄酥脆' },
      { stepNumber: 3, content: '调凯撒酱：蛋黄酱+蒜末+柠檬汁+帕玛森碎+黑胡椒拌匀' },
      { stepNumber: 4, content: '生菜铺盘，淋上凯撒酱' },
      { stepNumber: 5, content: '撒上面包丁和帕玛森芝士薄片' }
    ])
  },
  {
    id: uuidv4(),
    title: '奶油蘑菇汤',
    coverImage: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    author: '法餐大厨',
    cookTime: 30,
    description: '法式经典浓汤，蘑菇鲜香与奶油丝滑完美融合，温暖治愈。',
    category: 'western',
    difficulty: 'easy',
    season: 'winter',
    servings: 4,
    ingredients: JSON.stringify([
      { name: '白蘑菇', amount: 300, unit: 'g' },
      { name: '洋葱', amount: 1, unit: '个' },
      { name: '黄油', amount: 30, unit: 'g' },
      { name: '面粉', amount: 2, unit: '勺' },
      { name: '淡奶油', amount: 100, unit: 'ml' },
      { name: '鸡汤', amount: 500, unit: 'ml' },
      { name: '盐', amount: 1, unit: '茶匙' },
      { name: '黑胡椒', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '蘑菇切片，洋葱切碎' },
      { stepNumber: 2, content: '黄油入锅融化，炒香洋葱至透明' },
      { stepNumber: 3, content: '加入蘑菇翻炒至出水变软' },
      { stepNumber: 4, content: '撒入面粉翻炒1分钟' },
      { stepNumber: 5, content: '倒入鸡汤，搅拌均匀，小火煮15分钟' },
      { stepNumber: 6, content: '用料理机打成细腻浓汤' },
      { stepNumber: 7, content: '倒回锅中加淡奶油，盐和胡椒调味' }
    ])
  },

  // 日料补充
  {
    id: uuidv4(),
    title: '日式炸猪排',
    coverImage: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=300&fit=crop',
    author: '日式料理屋',
    cookTime: 25,
    description: '外酥里嫩的日式经典，面包糠裹出金黄脆壳，搭配猪排酱和卷心菜丝。',
    category: 'japanese',
    difficulty: 'medium',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '猪里脊', amount: 300, unit: 'g' },
      { name: '鸡蛋', amount: 2, unit: '个' },
      { name: '面粉', amount: 50, unit: 'g' },
      { name: '面包糠', amount: 80, unit: 'g' },
      { name: '卷心菜', amount: 100, unit: 'g' },
      { name: '猪排酱', amount: 3, unit: '勺' },
      { name: '食用油', amount: 300, unit: 'ml' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '猪里脊用刀背拍松至1厘米厚，撒盐和黑胡椒' },
      { stepNumber: 2, content: '依次裹面粉→蛋液→面包糠，按压紧实' },
      { stepNumber: 3, content: '油温170°C，下猪排炸3分钟至金黄' },
      { stepNumber: 4, content: '捞出沥油，静置2分钟后切条' },
      { stepNumber: 5, content: '卷心菜切细丝铺盘，放上猪排' },
      { stepNumber: 6, content: '搭配猪排酱和柠檬角食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '亲子丼',
    coverImage: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
    author: '日式料理屋',
    cookTime: 15,
    description: '鸡肉和鸡蛋的经典搭配，滑嫩的蛋液包裹鸡肉，浇在热米饭上。',
    category: 'japanese',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '鸡腿肉', amount: 200, unit: 'g' },
      { name: '鸡蛋', amount: 3, unit: '个' },
      { name: '洋葱', amount: 0.5, unit: '个' },
      { name: '米饭', amount: 2, unit: '碗' },
      { name: '出汁', amount: 150, unit: 'ml' },
      { name: '酱油', amount: 2, unit: '勺' },
      { name: '味醂', amount: 2, unit: '勺' },
      { name: '葱花', amount: 10, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '鸡腿肉切小块，洋葱切丝' },
      { stepNumber: 2, content: '鸡蛋打散（不要完全打匀，保留蛋白蛋黄层次）' },
      { stepNumber: 3, content: '锅中倒入出汁、酱油、味醂煮开' },
      { stepNumber: 4, content: '放入鸡肉和洋葱，中火煮5分钟至鸡肉熟透' },
      { stepNumber: 5, content: '均匀淋入蛋液，盖盖焖30秒至半熟' },
      { stepNumber: 6, content: '倒在热米饭上，撒葱花即可' }
    ])
  },

  // 泰餐
  {
    id: uuidv4(),
    title: '冬阴功汤',
    coverImage: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    author: '泰味厨房',
    cookTime: 25,
    description: '酸辣鲜香的泰国国汤，椰奶的醇厚与柠檬草的清新完美平衡。',
    category: 'thai',
    difficulty: 'medium',
    season: 'summer',
    servings: 3,
    ingredients: JSON.stringify([
      { name: '大虾', amount: 200, unit: 'g' },
      { name: '椰奶', amount: 200, unit: 'ml' },
      { name: '冬阴功酱', amount: 2, unit: '勺' },
      { name: '柠檬草', amount: 2, unit: '根' },
      { name: '青柠', amount: 2, unit: '个' },
      { name: '蘑菇', amount: 100, unit: 'g' },
      { name: '鱼露', amount: 2, unit: '勺' },
      { name: '辣椒', amount: 2, unit: '个' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '柠檬草拍扁切段，蘑菇切片，虾去虾线' },
      { stepNumber: 2, content: '锅中加水煮开，放入柠檬草和冬阴功酱' },
      { stepNumber: 3, content: '煮5分钟出香味后加入椰奶' },
      { stepNumber: 4, content: '放入蘑菇和虾，煮至虾变红' },
      { stepNumber: 5, content: '加鱼露和青柠汁调味' },
      { stepNumber: 6, content: '放辣椒装饰，趁热食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '泰式芒果糯米饭',
    coverImage: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop',
    author: '泰味厨房',
    cookTime: 40,
    description: '泰国经典甜品，椰奶浸润的糯米饭搭配新鲜芒果，香甜软糯。',
    category: 'thai',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '糯米', amount: 200, unit: 'g' },
      { name: '芒果', amount: 1, unit: '个' },
      { name: '椰奶', amount: 150, unit: 'ml' },
      { name: '糖', amount: 30, unit: 'g' },
      { name: '盐', amount: 1, unit: '撮' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '糯米提前浸泡4小时，蒸熟' },
      { stepNumber: 2, content: '椰奶加糖和盐小火加热至糖融化' },
      { stepNumber: 3, content: '将2/3椰奶倒入糯米饭中拌匀，焖15分钟吸收' },
      { stepNumber: 4, content: '芒果去皮切片' },
      { stepNumber: 5, content: '糯米饭盛盘，摆上芒果片' },
      { stepNumber: 6, content: '淋上剩余椰奶即可' }
    ])
  },

  // 韩餐补充
  {
    id: uuidv4(),
    title: '泡菜豆腐汤',
    coverImage: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
    author: '韩国料理王',
    cookTime: 20,
    description: '酸辣开胃的韩式家常汤，泡菜发酵的酸香与嫩豆腐的柔滑完美搭配。',
    category: 'korean',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '韩式泡菜', amount: 200, unit: 'g' },
      { name: '嫩豆腐', amount: 1, unit: '盒' },
      { name: '猪五花', amount: 100, unit: 'g' },
      { name: '葱', amount: 2, unit: '根' },
      { name: '韩式辣酱', amount: 1, unit: '勺' },
      { name: '蒜末', amount: 1, unit: '勺' },
      { name: '淘米水', amount: 400, unit: 'ml' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '五花肉切薄片，泡菜切段' },
      { stepNumber: 2, content: '热锅下五花肉煸出油脂' },
      { stepNumber: 3, content: '加入泡菜翻炒2分钟' },
      { stepNumber: 4, content: '倒入淘米水，加辣酱和蒜末煮开' },
      { stepNumber: 5, content: '豆腐切块轻轻放入，中火煮10分钟' },
      { stepNumber: 6, content: '撒上葱花，配白米饭食用' }
    ])
  },

  // 印度菜
  {
    id: uuidv4(),
    title: '黄油鸡',
    coverImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    author: '印度美食家',
    cookTime: 45,
    description: '印度最受欢迎的咖喱菜式，浓郁的番茄奶油酱汁包裹嫩滑鸡肉。',
    category: 'indian',
    difficulty: 'medium',
    servings: 4,
    ingredients: JSON.stringify([
      { name: '鸡腿肉', amount: 500, unit: 'g' },
      { name: '番茄', amount: 4, unit: '个' },
      { name: '洋葱', amount: 1, unit: '个' },
      { name: '黄油', amount: 40, unit: 'g' },
      { name: '淡奶油', amount: 100, unit: 'ml' },
      { name: '蒜', amount: 4, unit: '瓣' },
      { name: '姜', amount: 20, unit: 'g' },
      { name: '咖喱粉', amount: 2, unit: '勺' },
      { name: '孜然粉', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '鸡肉切块，用酸奶、咖喱粉、盐腌制30分钟' },
      { stepNumber: 2, content: '黄油入锅，炒香洋葱、蒜末、姜末' },
      { stepNumber: 3, content: '加入番茄碎煮至浓稠，用料理机打成酱' },
      { stepNumber: 4, content: '倒回锅中，加孜然粉和剩余咖喱粉' },
      { stepNumber: 5, content: '放入鸡肉煮15分钟至熟透' },
      { stepNumber: 6, content: '加入淡奶油搅匀，小火煮5分钟' },
      { stepNumber: 7, content: '搭配印度烤饼或米饭食用' }
    ])
  },
  {
    id: uuidv4(),
    title: '印度烤饼',
    coverImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    author: '印度美食家',
    cookTime: 20,
    description: '松软有嚼劲的印度经典面饼，蘸咖喱汁或配黄油鸡都绝佳。',
    category: 'indian',
    difficulty: 'medium',
    servings: 4,
    ingredients: JSON.stringify([
      { name: '中筋面粉', amount: 300, unit: 'g' },
      { name: '酸奶', amount: 100, unit: 'g' },
      { name: '酵母', amount: 3, unit: 'g' },
      { name: '糖', amount: 5, unit: 'g' },
      { name: '盐', amount: 3, unit: 'g' },
      { name: '黄油', amount: 30, unit: 'g' },
      { name: '蒜末', amount: 10, unit: 'g' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '面粉、酵母、糖、盐、酸奶混合，揉成光滑面团' },
      { stepNumber: 2, content: '盖保鲜膜发酵1小时至两倍大' },
      { stepNumber: 3, content: '分成4份，擀成椭圆形薄饼' },
      { stepNumber: 4, content: '烤箱预热最高温，烤盘预热' },
      { stepNumber: 5, content: '面饼放入烤箱烤3-4分钟至鼓泡金黄' },
      { stepNumber: 6, content: '出炉刷蒜香黄油' }
    ])
  },

  // 地中海
  {
    id: uuidv4(),
    title: '希腊沙拉',
    coverImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=300&fit=crop',
    author: '地中海厨房',
    cookTime: 10,
    description: '清爽的地中海经典，番茄、黄瓜、橄榄和菲达芝士的简单组合。',
    category: 'mediterranean',
    difficulty: 'easy',
    servings: 2,
    ingredients: JSON.stringify([
      { name: '番茄', amount: 2, unit: '个' },
      { name: '黄瓜', amount: 1, unit: '根' },
      { name: '紫洋葱', amount: 0.5, unit: '个' },
      { name: '菲达芝士', amount: 100, unit: 'g' },
      { name: '黑橄榄', amount: 10, unit: '颗' },
      { name: '橄榄油', amount: 3, unit: '勺' },
      { name: '牛至', amount: 1, unit: '茶匙' }
    ]),
    steps: JSON.stringify([
      { stepNumber: 1, content: '番茄切块，黄瓜切半月片，洋葱切薄圈' },
      { stepNumber: 2, content: '所有蔬菜放入沙拉碗' },
      { stepNumber: 3, content: '放上黑橄榄' },
      { stepNumber: 4, content: '菲达芝士切厚片或掰块放上' },
      { stepNumber: 5, content: '淋上特级初榨橄榄油，撒牛至' }
    ])
  }
]

// ── 视频数据映射 ──────────────────────────────────────────────
// 关联方式：通过 recipe title 匹配，支持 v2 变体
const videoEmbeds = [
  { title: '冬阴功汤', videos: [
    { url: 'https://www.bilibili.com/video/BV1QP4y1m7BS', platform: 'bilibili', title: '辣而不呛，喝到冒汗！比泰国五星级酒店的味道还要好~丨冬阴功汤', duration: 530, sortOrder: 0 },
    { url: 'https://www.bilibili.com/video/BV1oV411r79G', platform: 'bilibili', title: '「浓汤冬阴功」抛弃冬阴功酱，用香料真材实料熬制的汤才是正宗好汤', duration: 412, sortOrder: 1 },
  ]},
  { title: '班尼迪克蛋', videos: [
    { url: 'https://www.youtube.com/embed/OCMvGznWL00', platform: 'youtube', title: 'How To Make Perfect Eggs Benedict', duration: 480, sortOrder: 0 },
  ]},
  { title: '鱼香肉丝', videos: [
    { url: 'https://www.bilibili.com/video/BV1WJ4m1M7rJ', platform: 'bilibili', title: '厨师长教你："鱼香肉丝重庆版"的家常做法，酸辣下饭', duration: 217, sortOrder: 0 },
    { url: 'https://www.bilibili.com/video/BV1cs421M7AM', platform: 'bilibili', title: '【北方版鱼香肉丝详细但不啰嗦全讲解】保姆级教程包教包会', duration: 137, sortOrder: 1 },
  ]},
  { title: '提拉米苏', videos: [
    { url: 'https://www.youtube.com/embed/5J_FwNwkYF8', platform: 'youtube', title: 'Classic Tiramisu Recipe - How to Make Perfect Tiramisu', duration: 600, sortOrder: 0 },
  ]},
  { title: '卤肉饭', videos: [
    { url: 'https://www.bilibili.com/video/BV1LK41157ob', platform: 'bilibili', title: '正宗台湾卤肉饭，肥而不腻入口即化，配饭绝了', duration: 360, sortOrder: 0 },
  ]},
  { title: '回锅肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1GJ411v7WU', platform: 'bilibili', title: '回锅肉的正宗做法，大厨教你技巧，肥而不腻太香了', duration: 300, sortOrder: 0 },
    { url: 'https://www.bilibili.com/video/BV1PJ411z7R1', platform: 'bilibili', title: '经典川菜回锅肉，这样做最地道，连吃三碗饭', duration: 340, sortOrder: 1 },
  ]},
  { title: '辣子鸡', videos: [
    { url: 'https://www.bilibili.com/video/BV1HJ411D7cB', platform: 'bilibili', title: '辣子鸡家常做法，麻辣酥脆，比饭店还好吃', duration: 280, sortOrder: 0 },
  ]},
  { title: '天妇罗', videos: [
    { url: 'https://www.youtube.com/embed/j6N1HNOqhko', platform: 'youtube', title: 'Japanese Tempura - Crispy & Delicious Homemade Recipe', duration: 540, sortOrder: 0 },
  ]},
  { title: '小炒黄牛肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1eJ411k7nB', platform: 'bilibili', title: '小炒黄牛肉，大火快炒鲜嫩多汁，湘菜经典做法', duration: 260, sortOrder: 0 },
  ]},
  { title: '水煮鱼', videos: [
    { url: 'https://www.bilibili.com/video/BV1tJ41157Ek', platform: 'bilibili', title: '水煮鱼的正宗做法，麻辣鲜香鱼片嫩滑，学会可以开店了', duration: 420, sortOrder: 0 },
  ]},
  { title: '韩式拌饭', videos: [
    { url: 'https://www.youtube.com/embed/xioQ3csvTIc', platform: 'youtube', title: 'Korean Bibimbap Recipe - The Ultimate Comfort Food', duration: 480, sortOrder: 0 },
  ]},
  { title: '蒜蓉粉丝蒸扇贝', videos: [
    { url: 'https://www.bilibili.com/video/BV1YJ411r7Fc', platform: 'bilibili', title: '蒜蓉粉丝蒸扇贝，鲜香滑嫩，宴客必备大菜', duration: 240, sortOrder: 0 },
  ]},
  { title: '避风塘炒蟹', videos: [
    { url: 'https://www.bilibili.com/video/BV1WE411x7hC', platform: 'bilibili', title: '避风塘炒蟹，香辣酥脆，粤式经典做法', duration: 320, sortOrder: 0 },
  ]},
  { title: '泰式绿咖喱鸡', videos: [
    { url: 'https://www.youtube.com/embed/z4tN5J7jZo0', platform: 'youtube', title: 'Thai Green Curry Recipe - Authentic & Easy to Make', duration: 550, sortOrder: 0 },
  ]},
  { title: '韩式泡菜锅', videos: [
    { url: 'https://www.youtube.com/embed/6KH3DjLrgSY', platform: 'youtube', title: 'Kimchi Jjigae - Korean Kimchi Stew Recipe', duration: 420, sortOrder: 0 },
  ]},
  { title: '章鱼小丸子', videos: [
    { url: 'https://www.bilibili.com/video/BV1s4411F7mV', platform: 'bilibili', title: '章鱼小丸子详细教程，外酥里嫩，在家也能做', duration: 380, sortOrder: 0 },
  ]},
  { title: '白切鸡', videos: [
    { url: 'https://www.bilibili.com/video/BV1TE411w7V3', platform: 'bilibili', title: '白切鸡的正宗做法，皮爽肉滑，大厨详细讲解', duration: 350, sortOrder: 0 },
  ]},
  { title: '干炒牛河', videos: [
    { url: 'https://www.bilibili.com/video/BV1M4411Q7zA', platform: 'bilibili', title: '干炒牛河，锅气十足，大厨教你在家做', duration: 310, sortOrder: 0 },
  ]},
  { title: '焦糖布丁', videos: [
    { url: 'https://www.youtube.com/embed/U5jFzVk4nrE', platform: 'youtube', title: 'How To Make Perfect Creme Caramel / Flan', duration: 500, sortOrder: 0 },
  ]},
  { title: '法式洋葱汤', videos: [
    { url: 'https://www.youtube.com/embed/jdS7jptBOU8', platform: 'youtube', title: 'Classic French Onion Soup Recipe', duration: 600, sortOrder: 0 },
  ]},
  // ── 第二轮（迭代 #60）：视频覆盖扩容 20→39 食谱 ───────────
  { title: '酸菜鱼', videos: [
    { url: 'https://www.bilibili.com/video/BV1mK411F7oM', platform: 'bilibili', title: '川菜"酸菜水煮鱼"的家常做法，鱼片滑嫩，麻辣鲜香', duration: 301, sortOrder: 0 },
  ]},
  { title: '红烧肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1HA411v7iv', platform: 'bilibili', title: '"电饭锅红烧肉"的家常做法，满满的小技巧，收藏了', duration: 565, sortOrder: 0 },
  ]},
  { title: '宫保鸡丁', videos: [
    { url: 'https://www.bilibili.com/video/BV1Xt411Z7z8', platform: 'bilibili', title: '"宫保鸡丁"的川味正宗做法，一看就有食欲，收藏了', duration: 222, sortOrder: 0 },
  ]},
  { title: '麻婆豆腐', videos: [
    { url: 'https://www.bilibili.com/video/BV1Rs411V7i9', platform: 'bilibili', title: '"麻婆豆腐"的正宗做法，吃的停不下来', duration: 286, sortOrder: 0 },
  ]},
  { title: '糖醋排骨', videos: [
    { url: 'https://www.bilibili.com/video/BV1dq4y1Q718', platform: 'bilibili', title: '"糖醋排骨"的最新做法，酸甜开胃，好吃不腻', duration: 196, sortOrder: 0 },
  ]},
  { title: '清蒸鲈鱼', videos: [
    { url: 'https://www.bilibili.com/video/BV1QU4y1j7T4', platform: 'bilibili', title: '"清蒸鲈鱼"，鲜嫩美味，内附蒸鱼酱油专业调制方法', duration: 223, sortOrder: 0 },
  ]},
  { title: '可乐鸡翅', videos: [
    { url: 'https://www.bilibili.com/video/BV1vE411h7VP', platform: 'bilibili', title: '"可乐鸡翅"的家常做法，味道鲜嫩可口，先收藏起来', duration: 240, sortOrder: 0 },
  ]},
  { title: '西红柿炒鸡蛋', videos: [
    { url: 'https://www.bilibili.com/video/BV1Py4y1S7EF', platform: 'bilibili', title: '"番茄炒蛋"的6种做法，多种版本适合各类人群', duration: 503, sortOrder: 0 },
  ]},
  { title: '葱油拌面', videos: [
    { url: 'https://www.bilibili.com/video/BV1Pm4y1X796', platform: 'bilibili', title: '"葱油拌面"，葱香酱香十足，吃起来根本停不下来', duration: 542, sortOrder: 0 },
  ]},
  { title: '剁椒鱼头', videos: [
    { url: 'https://www.bilibili.com/video/BV1R34y1p7qG', platform: 'bilibili', title: '一道剁椒鱼头俘获四伯的胃，笑称你会做我会吃，天生一对', duration: 424, sortOrder: 0 },
  ]},
  { title: '东坡肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1CebaznE19', platform: 'bilibili', title: '做一道稀溜耙的家常版"东坡肉"，肥而不腻，伯爷直接密干', duration: 1056, sortOrder: 0 },
  ]},
  { title: '酸辣土豆丝', videos: [
    { url: 'https://www.bilibili.com/video/BV1TFo7BiEYe', platform: 'bilibili', title: '酸辣土豆丝像我这样做，酸辣爽口，超级入味', duration: 295, sortOrder: 0 },
  ]},
  { title: '地三鲜', videos: [
    { url: 'https://www.bilibili.com/video/BV1iW411N7CY', platform: 'bilibili', title: '厨师长教你一道北方菜："地三鲜"的家常做法，味道很赞', duration: 191, sortOrder: 0 },
  ]},
  { title: '虾饺', videos: [
    { url: 'https://www.bilibili.com/video/BV1xhLw69EGM', platform: 'bilibili', title: '皮薄爆汁的广东早茶水晶虾饺', duration: 216, sortOrder: 0 },
  ]},
  { title: '普罗旺斯炖菜', videos: [
    { url: 'https://www.youtube.com/embed/nL1nM3Sr3bg', platform: 'youtube', title: '《料理鼠王》里普罗旺斯炖菜，法式杂菜煲 Ratatouille Recipe', duration: 520, sortOrder: 0 },
  ]},
  { title: '意大利肉酱面', videos: [
    { url: 'https://www.youtube.com/embed/JBN-k3-noVo', platform: 'youtube', title: '番茄肉酱意面 Spaghetti with Meat Sauce', duration: 480, sortOrder: 0 },
  ]},
  { title: '豚骨拉面', videos: [
    { url: 'https://www.youtube.com/embed/wv5dylzXuBs', platform: 'youtube', title: '《豚骨拉面全套配方》| Tonkotsu Ramen [Eng Sub]', duration: 600, sortOrder: 0 },
  ]},
  { title: '芒果糯米饭', videos: [
    { url: 'https://www.youtube.com/embed/WB___WEpfkw', platform: 'youtube', title: '椰汁芒果糯米饭 Mango Sticky Rice Recipe Thailand', duration: 450, sortOrder: 0 },
  ]},
  { title: '白灼基围虾', videos: [
    { url: 'https://www.bilibili.com/video/BV1urFSzBEWv', platform: 'bilibili', title: '厨师长分享现场版"一虾两吃"，白灼虾汁水充沛，香辣虾酥脆够味', duration: 899, sortOrder: 0 },
  ]},
  // ── 第三轮（迭代#67）：视频覆盖扩容 39→~59 食谱 ───────────
  { title: '东北乱炖', videos: [
    { url: 'https://www.bilibili.com/video/BV1xoAhzxEuZ/', platform: 'bilibili', title: '东北乱炖家常做法', duration: 480, sortOrder: 0 },
  ]},
  { title: '麻酱凉面', videos: [
    { url: 'https://www.bilibili.com/video/BV16pGt65E2Y/', platform: 'bilibili', title: '麻酱凉面做法', duration: 300, sortOrder: 0 },
  ]},
  { title: '红烧牛腩', videos: [
    { url: 'https://www.bilibili.com/video/BV1bi516jE4Q/', platform: 'bilibili', title: '红烧牛腩家常做法', duration: 600, sortOrder: 0 },
  ]},
  { title: '干锅花菜', videos: [
    { url: 'https://www.bilibili.com/video/BV1hipUzaEHH/', platform: 'bilibili', title: '干锅花菜做法', duration: 360, sortOrder: 0 },
  ]},
  { title: '蚝油生菜', videos: [
    { url: 'https://www.bilibili.com/video/BV1M44y187u6/', platform: 'bilibili', title: '蚝油生菜做法', duration: 240, sortOrder: 0 },
  ]},
  { title: '啤酒鸭', videos: [
    { url: 'https://www.bilibili.com/video/BV13DR4BvEy9/', platform: 'bilibili', title: '啤酒鸭做法', duration: 480, sortOrder: 0 },
  ]},
  { title: '扬州炒饭', videos: [
    { url: 'https://www.bilibili.com/video/BV1sU4y1B7MC/', platform: 'bilibili', title: '扬州炒饭做法', duration: 360, sortOrder: 0 },
  ]},
  { title: '小炒肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1Y7Gb6qE8M/', platform: 'bilibili', title: '辣椒炒肉/小炒肉家常做法', duration: 360, sortOrder: 0 },
  ]},
  { title: '韩式泡菜炒五花肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1rp4y1C761/', platform: 'bilibili', title: '韩式泡菜炒五花肉做法', duration: 360, sortOrder: 0 },
  ]},
  { title: '韩式炒年糕', videos: [
    { url: 'https://www.youtube.com/embed/rggS-GidUpk', platform: 'youtube', title: 'How to Make Tteokbokki (Spicy Korean Rice Cakes)', duration: 480, sortOrder: 0 },
    { url: 'https://www.youtube.com/embed/ZhUGVCT22EA', platform: 'youtube', title: 'Easy Tteokbokki Recipe', duration: 360, sortOrder: 1 },
  ]},
  { title: '抹茶千层蛋糕', videos: [
    { url: 'https://www.youtube.com/embed/Iog-pNmqvhU', platform: 'youtube', title: 'Matcha Crepe Cake Recipe', duration: 600, sortOrder: 0 },
  ]},
  { title: '番茄意面', videos: [
    { url: 'https://www.youtube.com/embed/DfB0EtvUv1c', platform: 'youtube', title: 'Pomodoro Pasta Recipe', duration: 360, sortOrder: 0 },
  ]},
  { title: '法式焦糖布丁', videos: [
    { url: 'https://www.youtube.com/embed/6tSdlo0r0Io', platform: 'youtube', title: 'Creme Brulee Recipe', duration: 480, sortOrder: 0 },
  ]},
  { title: '越南牛肉河粉', videos: [
    { url: 'https://www.youtube.com/embed/WlosNFMCnE4', platform: 'youtube', title: 'Authentic Vietnamese Pho Recipe', duration: 600, sortOrder: 0 },
  ]},
  { title: '奶油蘑菇汤', videos: [
    { url: 'https://www.youtube.com/embed/pKedpDltnOM', platform: 'youtube', title: 'Mushroom Soup Recipe', duration: 360, sortOrder: 0 },
  ]},
  { title: '味噌拉面', videos: [
    { url: 'https://www.youtube.com/embed/_pIdGMX65qM', platform: 'youtube', title: 'Miso Ramen Recipe', duration: 480, sortOrder: 0 },
  ]},
  { title: '日式照烧鸡腿', videos: [
    { url: 'https://www.youtube.com/embed/Rs3fqWuVb94', platform: 'youtube', title: 'Teriyaki Chicken Recipe', duration: 360, sortOrder: 0 },
  ]},
  { title: '泰式绿咖喱鸡', videos: [
    { url: 'https://www.youtube.com/embed/zPkOPx1Oelw', platform: 'youtube', title: 'Thai Green Curry Recipe', duration: 480, sortOrder: 0 },
  ]},
  // ── 第四轮（迭代#72）：视频覆盖 62.2%→82.9% ───────────
  { title: '兰州牛肉面', videos: [
    { url: 'https://www.bilibili.com/video/BV1Ay4y1i7S1', platform: 'bilibili', title: '兰州人家庭版正宗兰州牛肉面的做法(不是兰州拉面啦)详尽菜谱步骤在视频最后', duration: 480, sortOrder: 0 },
  ]},
  { title: '大盘鸡', videos: [
    { url: 'https://www.bilibili.com/video/BV1XNyTYZEWh', platform: 'bilibili', title: '比饭店做的还好吃的大盘鸡只要一分钟就能学会，味道超赞', duration: 360, sortOrder: 0 },
  ]},
  { title: '水煮牛肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1Qu411G7ae', platform: 'bilibili', title: '原来这才是水煮牛肉的正宗做法!', duration: 420, sortOrder: 0 },
  ]},
  { title: '鱼头豆腐汤', videos: [
    { url: 'https://www.bilibili.com/video/BV1AX4y1N77u', platform: 'bilibili', title: '老太教你做鱼头豆腐汤如何味道鲜美汤白如牛奶', duration: 300, sortOrder: 0 },
  ]},
  { title: '日式牛丼', videos: [
    { url: 'https://www.bilibili.com/video/BV1cJ411D7do', platform: 'bilibili', title: '【Mingsze】超简单日式牛丼 六个步骤 10分钟', duration: 360, sortOrder: 0 },
  ]},
  { title: '韩式烤五花肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1mT4y1u7nS', platform: 'bilibili', title: '来自韩剧请回答1988里的烤肉，韩式猪五花，保证看着视频流口水', duration: 420, sortOrder: 0 },
  ]},
  { title: '干煸四季豆', videos: [
    { url: 'https://www.bilibili.com/video/BV1os411e7Hf', platform: 'bilibili', title: '【美食台】干煸四季豆，美味的关键在于炸!', duration: 240, sortOrder: 0 },
  ]},
  { title: '罗宋汤', videos: [
    { url: 'https://www.bilibili.com/video/BV1oT41197mk', platform: 'bilibili', title: '俄罗斯姐姐教你怎么做罗宋汤，第一次做就能成功!', duration: 360, sortOrder: 0 },
  ]},
  { title: '凯撒沙拉', videos: [
    { url: 'https://www.bilibili.com/video/BV1pp411R7Bo', platform: 'bilibili', title: '【迷迭香】一招教你学做经典凯撒沙拉!', duration: 240, sortOrder: 0 },
  ]},
  { title: '日式咖喱饭', videos: [
    { url: 'https://www.bilibili.com/video/BV18d4y1Z7Uo', platform: 'bilibili', title: '【日本家常菜】学做正宗日式咖喱饭 好吃的秘诀 和风无水番茄奇玛咖哩肉饭', duration: 480, sortOrder: 0 },
  ]},
  { title: '醋溜白菜', videos: [
    { url: 'https://www.bilibili.com/video/BV1Wh4y1R7cn', platform: 'bilibili', title: '现在网上这个醋溜白菜真的太火了，居然还有人不会做，今天就教您正确的做法', duration: 300, sortOrder: 0 },
  ]},
  { title: '奶油培根意面', videos: [
    { url: 'https://www.bilibili.com/video/BV1So4y137Ns', platform: 'bilibili', title: '奶油培根意面浓郁奶香一人食小锅', duration: 300, sortOrder: 0 },
  ]},
  // 以下已有视频(#67)，本轮增至多视频源
  { title: '小炒肉', videos: [
    { url: 'https://www.bilibili.com/video/BV1Hy4y1b7Lw', platform: 'bilibili', title: '在家自己做小炒肉', duration: 300, sortOrder: 1 },
  ]},
  { title: '扬州炒饭', videos: [
    { url: 'https://www.bilibili.com/video/BV1j541187ad', platform: 'bilibili', title: '要做正宗的扬州炒饭，蛋丝是灵魂。否则一不小心就变成蛋炒饭了', duration: 360, sortOrder: 1 },
  ]},
  { title: '东北乱炖', videos: [
    { url: 'https://www.bilibili.com/video/BV1ct411f7ZW', platform: 'bilibili', title: '东北乱炖最正宗家常做法:食材选料最重要，先后顺序不能乱!', duration: 420, sortOrder: 1 },
  ]},
]

async function seed () {
  try {
    await db.sequelize.sync()

    // 清空旧数据
    await db.Comment.destroy({ where: {} })
    await db.Favorite.destroy({ where: {} })
    await db.Recipe.destroy({ where: {} })
    await db.User.destroy({ where: {} })

    // 创建管理员种子账号
    const hashedPassword = await bcrypt.hash('123456', 10)
    await db.User.create({
      id: uuidv4(),
      username: 'admin',
      email: 'test@test.com',
      password: hashedPassword,
      nickname: '管理员',
      role: 'admin'
    })

    console.log('✅ 管理员账号创建成功: test@test.com / 123456')

    // 插入新数据
    await db.Recipe.bulkCreate(recipes)

    // 创建食谱标题→ID查找表
    const allRecipes = await db.Recipe.findAll({ attributes: ['id', 'title'] })
    const recipeIdMap = {}
    for (const r of allRecipes) {
      recipeIdMap[r.title] = r.id
    }

    // 插入视频数据
    const videoRecords = []
    for (const entry of videoEmbeds) {
      const recipeId = recipeIdMap[entry.title]
      if (!recipeId) {
        console.log(`⚠️  seed视频跳过(未匹配): ${entry.title}`)
        continue
      }
      for (const v of entry.videos) {
        videoRecords.push({
          id: uuidv4(),
          recipeId,
          videoUrl: v.url,
          platform: v.platform,
          title: v.title,
          duration: v.duration,
          sortOrder: v.sortOrder,
          createdAt: new Date(),
        })
      }
    }

    if (videoRecords.length > 0) {
      await db.VideoEmbed.bulkCreate(videoRecords)
      console.log(`✅ 成功插入 ${videoRecords.length} 条视频记录`)
    }

    console.log(`✅ 成功插入 ${recipes.length} 条示范食谱`)
    console.log(`   分类分布: ${[...new Set(recipes.map(r => r.category))].join(', ')}`)

    // ── 生成评分数据 ──────────────────────────────────────────
    console.log('🔄 正在生成评分数据...')
    const adminUser = await db.User.findOne({ where: { username: 'admin' } })
    const secondUser = await db.User.findOne({ where: { username: { [db.Sequelize.Op.ne]: 'admin' } } })
    const userIds = [adminUser.id]
    if (secondUser) userIds.push(secondUser.id)

    const allRecipesWithCounts = await db.Recipe.findAll()
    // 按 favoriteCount + viewCount 权重排序划分热度
    const sortedByPop = allRecipesWithCounts.slice().sort((a, b) => {
      const scoreA = (a.favoriteCount || 0) * 2 + (a.viewCount || 0) * 0.3
      const scoreB = (b.favoriteCount || 0) * 2 + (b.viewCount || 0) * 0.3
      return scoreB - scoreA
    })
    const seedHotCount = Math.ceil(sortedByPop.length * 0.3)
    const seedNormalCount = Math.ceil(sortedByPop.length * 0.4)

    const ratingComments = {
      5: ['非常棒！','太好吃了','五星好评','完美教程','超级美味','味道绝了','好吃到哭','必须收藏','太赞了','零失败！'],
      4: ['不错','挺好吃的','味道很好','简单易学','全家都喜欢','还会再做','色香味俱全','推荐','一次成功','口感不错'],
      3: ['还行吧','一般般','中规中矩','还可以','味道普通','不难吃但一般','步骤清楚但味道一般','做法简单口味一般'],
      2: ['不太满意','做出来跟图片差好多','味道偏淡了','不太推荐','口感不好'],
      1: ['完全失败了','不推荐','差评','味道真不行','教程有误'],
    }

    const allComments = []
    for (let i = 0; i < sortedByPop.length; i++) {
      const r = sortedByPop[i]
      let count, avgTarget
      if (i < seedHotCount) { count = 10 + Math.floor(Math.random() * 9); avgTarget = 4.2 + Math.random() * 0.6 }
      else if (i < seedHotCount + seedNormalCount) { count = 3 + Math.floor(Math.random() * 8); avgTarget = 3.5 + Math.random() * 0.8 }
      else { count = 1 + Math.floor(Math.random() * 3); avgTarget = 2.5 + Math.random() * 1.0 }

      let ratings = []
      for (let j = 0; j < count; j++) {
        let score = Math.round(avgTarget + (Math.random() - 0.5) * 2)
        score = Math.max(1, Math.min(5, score))
        ratings.push(score)
      }
      // 保证至少一条高分
      if (!ratings.some(s => s === 5)) ratings[0] = 5
      // 保证至少一条中低分
      if (!ratings.some(s => s <= 3)) ratings[ratings.length - 1] = 2 + Math.floor(Math.random() * 2)

      ratings = ratings.slice(0, count)
      for (let j = ratings.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1)); [ratings[j], ratings[k]] = [ratings[k], ratings[j]]
      }

      for (const rating of ratings) {
        const opts = ratingComments[rating] || ratingComments[3]
        const comment = opts[Math.floor(Math.random() * opts.length)]
        const userId = userIds[Math.floor(Math.random() * userIds.length)]
        const daysAgo = Math.floor(Math.random() * 30)
        const date = new Date(Date.now() - daysAgo * 86400000 - Math.floor(Math.random() * 86400000))
        allComments.push({
          content: comment,
          rating,
          userId,
          recipeId: r.id,
          likesCount: Math.floor(Math.random() * 20),
          createdAt: date,
        })
      }
    }

    if (allComments.length > 0) {
      await db.Comment.bulkCreate(allComments)
      // 更新 avgRating / ratingCount
      for (const r of allRecipesWithCounts) {
        const recipeComments = allComments.filter(c => c.recipeId === r.id)
        if (recipeComments.length > 0) {
          const sum = recipeComments.reduce((s, c) => s + c.rating, 0)
          await db.Recipe.update(
            { avgRating: (sum / recipeComments.length).toFixed(2), ratingCount: recipeComments.length },
            { where: { id: r.id } }
          )
        }
      }
      console.log(`✅ 成功插入 ${allComments.length} 条评分记录`)
    }

    process.exit(0)
  } catch (err) {
    console.error('❌ 种子数据插入失败:', err.message)
    process.exit(1)
  }
}

seed()