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
  // ── #83 新增：越南春卷 ──
  {
    id: uuidv4(),
    title: '越南春卷',
    coverImage: 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 20,
    description: '越南经典冷卷，透明米纸包裹鲜虾、米粉、生菜和香草，蘸鱼露酸甜汁，清新爽口。',
    category: 'vietnamese',
    difficulty: 'easy',
    season: 'summer',
    servings: 4,
    ingredients: JSON.stringify([{"name": "越南米纸", "amount": 12, "unit": "张"}, {"name": "鲜虾", "amount": 200, "unit": "g"}, {"name": "米粉", "amount": 100, "unit": "g"}, {"name": "生菜", "amount": 6, "unit": "片"}, {"name": "薄荷叶", "amount": 20, "unit": "片"}, {"name": "香菜", "amount": 20, "unit": "g"}, {"name": "胡萝卜", "amount": 1, "unit": "根"}, {"name": "豆芽", "amount": 100, "unit": "g"}]),
    steps: JSON.stringify(["鲜虾去壳去虾线，沸水煮2分钟至变红，捞出过凉水，对半切开", "米粉按包装煮软过凉水沥干", "胡萝卜切细丝，生菜撕小片，薄荷叶香菜洗净", "米纸在温水浸2-3秒至软", "平铺后依次放生菜、米粉、胡萝卜丝、豆芽", "摆虾仁、薄荷叶香菜", "先折两侧再从底部紧实卷起", "调蘸汁：鱼露+青柠汁+糖+蒜末+小米辣拌匀"]),
    nutrition: JSON.stringify({"calories": 180, "protein": 14, "fat": 3, "carbs": 28, "fiber": 2, "sodium": 520}),
    story: '越南春卷是越南最具代表性的街头美食之一，源于越南南部湄公河三角洲。越南语称"Gỏi cuốn"。19世纪法国殖民时期，越南人将法国面包和生菜沙拉元素融入本地饮食，演化出这道经典冷卷。',
    culturalBackground: '越南文化中春卷象征团圆丰收，家庭聚餐时一起卷春卷极富互动性。南部喜甜辣蘸酱，北部偏爱清淡鱼露。农历新年春卷是年夜饭不可或缺的菜品。',
    tips: '米纸浸泡不可超过5秒；虾勿煮久变红即捞出；包好湿布盖住防干；蘸汁青柠汁可用米醋替代',
    categoryTags: JSON.stringify({"ingredient": "seafood-rice", "method": "wrap", "cuisine": "vietnamese", "flavor": "fresh", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：越南牛肉粉 ──
  {
    id: uuidv4(),
    title: '越南牛肉粉',
    coverImage: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 90,
    description: '越南国汤，牛骨清汤熬煮数小时，搭配薄切牛肉和爽滑河粉，一碗浓香暖心。',
    category: 'vietnamese',
    difficulty: 'hard',
    season: 'winter',
    servings: 4,
    ingredients: JSON.stringify([{"name": "牛骨", "amount": 500, "unit": "g"}, {"name": "牛腱子", "amount": 300, "unit": "g"}, {"name": "越南河粉", "amount": 400, "unit": "g"}, {"name": "洋葱", "amount": 1, "unit": "个"}, {"name": "姜", "amount": 1, "unit": "块"}, {"name": "八角", "amount": 3, "unit": "个"}, {"name": "桂皮", "amount": 1, "unit": "根"}, {"name": "鱼露", "amount": 3, "unit": "勺"}, {"name": "豆芽", "amount": 200, "unit": "g"}, {"name": "薄荷叶", "amount": 20, "unit": "g"}, {"name": "青柠", "amount": 2, "unit": "个"}, {"name": "小米辣", "amount": 3, "unit": "个"}]),
    steps: JSON.stringify(["牛骨牛腱冷水下锅煮沸撇沫捞出", "洋葱姜烤至焦黑增烟熏味", "入锅加3升水大火煮沸加八角桂皮转小火慢炖1.5h不盖盖", "取出牛腱切薄片，汤底加鱼露糖调味过滤", "河粉煮软沥干分碗", "碗中摆牛肉片豆芽薄荷叶，浇滚烫牛骨汤", "配青柠角小米辣鱼露甜辣酱上桌"]),
    nutrition: JSON.stringify({"calories": 420, "protein": 32, "fat": 12, "carbs": 48, "fiber": 3, "sodium": 860}),
    story: '越南牛肉粉(Pho)是越南国菜，起源20世纪初越南北部南定。法国殖民时期大量牛骨被丢弃，越南小贩捡来熬汤结合本地河粉和中国粿条做法，意外创造传世美味。被CNN评为世界50大美食第28位。',
    culturalBackground: '越南Pho可一日三食但最地道是早餐。先喝原汤品味鲜度，再挤青柠加辣椒豆芽，最后加薄荷罗勒提香。北方汤清淡河粉宽，南方汤甜浓配菜更丰富。',
    tips: '熬汤不盖盖保持汤色清澈；牛腱煮至筷子刚可穿透即捞出；浇汤前将河粉烫一遍防黏；鱼露品质决定汤底层次',
    categoryTags: JSON.stringify({"ingredient": "beef-rice_noodles", "method": "braise", "cuisine": "vietnamese", "flavor": "savory", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：印度黄油鸡 ──
  {
    id: uuidv4(),
    title: '印度黄油鸡',
    coverImage: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 45,
    description: '印度最具国际知名度的经典咖喱，嫩滑鸡肉在浓郁番茄奶油酱汁中慢炖，配印度烤饼或米饭享用。',
    category: 'indian',
    difficulty: 'medium',
    season: 'winter',
    servings: 4,
    ingredients: JSON.stringify([{"name": "鸡腿肉", "amount": 500, "unit": "g"}, {"name": "酸奶", "amount": 100, "unit": "ml"}, {"name": "姜黄粉", "amount": 1, "unit": "茶匙"}, {"name": "孜然粉", "amount": 1, "unit": "茶匙"}, {"name": "番茄罐头", "amount": 400, "unit": "g"}, {"name": "黄油", "amount": 50, "unit": "g"}, {"name": "淡奶油", "amount": 150, "unit": "ml"}, {"name": "洋葱", "amount": 1, "unit": "个"}, {"name": "蒜", "amount": 4, "unit": "瓣"}, {"name": "姜", "amount": 15, "unit": "g"}, {"name": "咖喱粉", "amount": 2, "unit": "勺"}, {"name": "辣椒粉", "amount": 1, "unit": "茶匙"}, {"name": "糖", "amount": 1, "unit": "茶匙"}, {"name": "盐", "amount": 1, "unit": "茶匙"}]),
    steps: JSON.stringify(["鸡腿肉切块用酸奶姜黄粉孜然粉盐腌制30分钟", "洋葱蒜姜切碎末", "煎鸡肉至表面金黄盛出", "黄油融化炒洋葱末至金黄加蒜姜末", "加咖喱粉辣椒粉翻炒30秒", "倒入番茄罐头压碎加糖盐小火10分钟", "搅拌机打至顺滑回锅", "加淡奶油和鸡肉小火炖10-15分钟", "调整咸度淋黄油增香"]),
    nutrition: JSON.stringify({"calories": 480, "protein": 35, "fat": 30, "carbs": 16, "fiber": 3, "sodium": 720}),
    story: '印度黄油鸡诞生于20世纪50年代新德里Moti Mahal餐厅。创始人Kundan Lal Gujral为处理当天未卖完的Tandoori烤鸡，去骨切块放入番茄黄油酱汁炖煮，意外创造风靡全球的经典。',
    culturalBackground: '黄油鸡代表印度旁遮普饮食文化，大量使用乳制品和香料，偏向慢炖。在印度被视为餐厅菜或节庆特供，搭配Naan饼用手撕饼蘸取酱汁食用。',
    tips: '鸡肉腌制不可省略；番茄罐头比新鲜番茄风味更浓；酱汁搅拌后口感更顺滑；最后淋黄油让酱汁更亮泽',
    categoryTags: JSON.stringify({"ingredient": "chicken-dairy", "method": "braise", "cuisine": "indian", "flavor": "creamy-spicy", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：印度烤饼 ──
  {
    id: uuidv4(),
    title: '印度烤饼',
    coverImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 30,
    description: '印式传统发酵饼，外酥内软，带有浓郁麦香和焦香斑，是咖喱类菜肴的最佳拍档。',
    category: 'indian',
    difficulty: 'medium',
    season: 'all',
    servings: 6,
    ingredients: JSON.stringify([{"name": "中筋面粉", "amount": 300, "unit": "g"}, {"name": "酸奶", "amount": 60, "unit": "ml"}, {"name": "温水", "amount": 120, "unit": "ml"}, {"name": "酵母", "amount": 3, "unit": "g"}, {"name": "糖", "amount": 5, "unit": "g"}, {"name": "盐", "amount": 3, "unit": "g"}, {"name": "黄油", "amount": 30, "unit": "g"}, {"name": "蒜", "amount": 3, "unit": "瓣"}, {"name": "香菜", "amount": 10, "unit": "g"}]),
    steps: JSON.stringify(["温水加酵母糖静置5分钟活化", "面粉加盐倒酵母水和酸奶揉光滑面团8-10分钟", "抹油盖保鲜膜发酵1小时至体积翻倍", "分6份滚圆松驰10分钟", "擀成椭圆厚3mm长20cm", "不粘锅大火干烙1分钟起大泡", "翻面再烙30-60秒至焦斑", "蒜末黄油融化拌香菜碎趁热刷在饼上"]),
    nutrition: JSON.stringify({"calories": 180, "protein": 6, "fat": 5, "carbs": 30, "fiber": 1, "sodium": 380}),
    story: '印度烤饼(Naan)是印度次大陆最古老发酵面食之一，有超5000年历史。Naan一词源自波斯语non(面包)，随莫卧儿帝国传入印度。传统在泥窑(Tandoor)中烤制。',
    culturalBackground: '印度饮食文化中Naan与咖喱关系像面包与汤，用于舀取浓稠酱汁。传统用右手撕小块沾咖喱送入口中。海外南亚裔社区中Naan代表文化归属与家庭团聚。',
    tips: '酸奶是软化关键让Naan更蓬松；发酵时间不宜过短；锅要够热才能产生焦斑；烙好后立即刷黄油保持柔软',
    categoryTags: JSON.stringify({"ingredient": "flour-dairy", "method": "bake", "cuisine": "indian", "flavor": "mild", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：希腊沙拉 ──
  {
    id: uuidv4(),
    title: '希腊沙拉',
    coverImage: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 10,
    description: '地中海饮食代表，新鲜番茄黄瓜搭配浓郁菲达芝士，浇上特级初榨橄榄油和牛至，简单却惊艳。',
    category: 'mediterranean',
    difficulty: 'easy',
    season: 'summer',
    servings: 3,
    ingredients: JSON.stringify([{"name": "番茄", "amount": 3, "unit": "个"}, {"name": "黄瓜", "amount": 1, "unit": "根"}, {"name": "紫洋葱", "amount": 0.5, "unit": "个"}, {"name": "菲达芝士", "amount": 150, "unit": "g"}, {"name": "黑橄榄", "amount": 80, "unit": "g"}, {"name": "青椒", "amount": 1, "unit": "个"}, {"name": "特级初榨橄榄油", "amount": 3, "unit": "勺"}, {"name": "红酒醋", "amount": 1, "unit": "勺"}, {"name": "干牛至", "amount": 1, "unit": "茶匙"}, {"name": "盐", "amount": 0.5, "unit": "茶匙"}]),
    steps: JSON.stringify(["番茄切块黄瓜切半月片青椒切圈", "紫洋葱切极薄环冰水浸泡5分钟去辛辣", "菲达芝士切2cm方块", "黑橄榄对半切", "所有蔬菜轻拌均匀", "摆菲达芝士块和黑橄榄", "淋橄榄油红酒醋撒干牛至和粗盐", "现磨黑胡椒立即上桌"]),
    nutrition: JSON.stringify({"calories": 240, "protein": 10, "fat": 18, "carbs": 12, "fiber": 4, "sodium": 680}),
    story: '希腊沙拉(Horiatiki意为乡村沙拉)起源于希腊乡村。正宗不加生菜，绿色来自番茄和青椒。农民田里现摘番茄、自家腌制橄榄、羊奶菲达芝士配上橄榄油，顶级食材不需要复杂烹饪。',
    culturalBackground: '希腊饮食中沙拉不是开胃菜而是配菜，在主菜之后上桌清口。希腊人用面包蘸食盘底橄榄油和番茄汁而非刀叉精细切。夏季几乎每顿饭都有希腊沙拉。',
    tips: '番茄必须完全成熟多汁；菲达用前冷藏20分钟口感更佳；橄榄油品质决定沙拉档次；切好后尽快拌食避免出水',
    categoryTags: JSON.stringify({"ingredient": "vegetables-cheese", "method": "raw", "cuisine": "mediterranean", "flavor": "fresh-tangy", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：鹰嘴豆泥 ──
  {
    id: uuidv4(),
    title: '鹰嘴豆泥',
    coverImage: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 15,
    description: '中东经典蘸酱，鹰嘴豆与芝麻酱的完美融合，丝滑浓郁，搭配热饼或蔬菜棒享用。',
    category: 'mediterranean',
    difficulty: 'easy',
    season: 'all',
    servings: 6,
    ingredients: JSON.stringify([{"name": "鹰嘴豆罐头", "amount": 400, "unit": "g"}, {"name": "芝麻酱", "amount": 60, "unit": "ml"}, {"name": "柠檬汁", "amount": 3, "unit": "勺"}, {"name": "蒜", "amount": 2, "unit": "瓣"}, {"name": "橄榄油", "amount": 3, "unit": "勺"}, {"name": "孜然粉", "amount": 0.5, "unit": "茶匙"}, {"name": "盐", "amount": 0.5, "unit": "茶匙"}, {"name": "冰水", "amount": 3, "unit": "勺"}, {"name": "辣椒粉", "amount": 0.5, "unit": "茶匙"}]),
    steps: JSON.stringify(["鹰嘴豆沥干微波高火加热2分钟", "搓去外皮口感丝滑关键", "芝麻酱柠檬汁蒜瓣橄榄油先搅打30秒", "加鹰嘴豆孜然粉盐冰水高速搅拌1-2分钟", "逐勺加水调整至丝滑奶油状", "尝味调整盐度和酸度", "盛浅盘用勺背划漩涡", "淋橄榄油撒辣椒粉孜然粉装饰"]),
    nutrition: JSON.stringify({"calories": 180, "protein": 8, "fat": 12, "carbs": 14, "fiber": 5, "sodium": 320}),
    story: '鹰嘴豆泥(Hummus)是世界上最古老的有据可查菜肴之一。最早记载见于13世纪开罗烹饪书。Hummus起源地一直是中东各国争论焦点，被称为Hummus之乡之争。',
    culturalBackground: '中东饮食中Hummus不仅是酱更是一种社交食物。Hummus专营店遍布街头，人们围坐用热皮塔饼蘸新鲜Hummus。斋月期间Hummus是开斋餐桌必备品。',
    tips: '去掉鹰嘴豆外皮是丝滑秘诀；芝麻酱需先搅打乳化防颗粒；冰水让成品更蓬松轻盈；食用前淋橄榄油撒孜然粉是必备步骤',
    categoryTags: JSON.stringify({"ingredient": "chickpeas-sesame", "method": "blend", "cuisine": "mediterranean", "flavor": "nutty-tangy", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：西班牙海鲜饭 ──
  {
    id: uuidv4(),
    title: '西班牙海鲜饭',
    coverImage: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 50,
    description: '西班牙国宝级料理，藏红花染就的金黄米饭铺满海鲜，锅底焦香锅巴是灵魂所在。',
    category: 'mediterranean',
    difficulty: 'hard',
    season: 'summer',
    servings: 4,
    ingredients: JSON.stringify([{"name": "西班牙短粒米", "amount": 300, "unit": "g"}, {"name": "大虾", "amount": 200, "unit": "g"}, {"name": "青口贝", "amount": 200, "unit": "g"}, {"name": "鱿鱼", "amount": 150, "unit": "g"}, {"name": "鸡腿", "amount": 200, "unit": "g"}, {"name": "西班牙辣香肠", "amount": 100, "unit": "g"}, {"name": "红甜椒", "amount": 1, "unit": "个"}, {"name": "青豆", "amount": 50, "unit": "g"}, {"name": "洋葱", "amount": 1, "unit": "个"}, {"name": "蒜", "amount": 3, "unit": "瓣"}, {"name": "番茄", "amount": 2, "unit": "个"}, {"name": "藏红花", "amount": 0.5, "unit": "茶匙"}, {"name": "烟熏红椒粉", "amount": 1, "unit": "茶匙"}, {"name": "橄榄油", "amount": 3, "unit": "勺"}, {"name": "柠檬", "amount": 1, "unit": "个"}, {"name": "鸡高汤", "amount": 750, "unit": "ml"}]),
    steps: JSON.stringify(["鸡腿切块腌制大虾去壳鱿鱼切圈青口刷净", "藏红花加热高汤浸泡15分钟", "厚底锅加橄榄油煎鸡腿金黄盛出", "加辣香肠煎出红油盛出炒洋葱蒜末至透明", "加番茄碎烟熏红椒粉炒至收干", "加短粒米翻炒1分钟倒藏红花水和高汤没过米1cm", "大火煮沸转中火10分钟不要搅拌", "摆大虾青口鱿鱼青豆红甜椒继续8-10分钟至收汁", "离火盖锡纸静置5分钟挤柠檬汁撒欧芹"]),
    nutrition: JSON.stringify({"calories": 560, "protein": 38, "fat": 18, "carbs": 58, "fiber": 3, "sodium": 920}),
    story: '西班牙海鲜饭(Paella)起源于瓦伦西亚阿尔布费拉湖周边。Paella来自拉丁语patella(平底锅)，原是农民渔夫的田间午餐。藏红花是8世纪摩尔人带入的珍贵香料。',
    culturalBackground: '西班牙Paella是家庭聚会标志性菜肴。去做一顿Paella意味着盛大社交活动。传统直接从锅中取食每人用木勺从自己位置开始吃。西班牙人从不在晚餐吃Paella。',
    tips: '必须用西班牙短粒米Bomba；煮的过程中绝对不可搅拌；离火静置5分钟让米饭收汁；锅底焦色锅巴Socarrat是精华',
    categoryTags: JSON.stringify({"ingredient": "rice-seafood", "method": "simmer", "cuisine": "mediterranean", "flavor": "savory-saffron", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：墨西哥塔可 ──
  {
    id: uuidv4(),
    title: '墨西哥塔可',
    coverImage: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 30,
    description: '墨西哥街头之王，玉米饼包裹香料腌制的牛肉、鲜辣莎莎酱和清新牛油果，一口入魂。',
    category: 'mexican',
    difficulty: 'easy',
    season: 'summer',
    servings: 4,
    ingredients: JSON.stringify([{"name": "牛绞肉", "amount": 400, "unit": "g"}, {"name": "玉米饼", "amount": 8, "unit": "张"}, {"name": "番茄", "amount": 2, "unit": "个"}, {"name": "牛油果", "amount": 1, "unit": "个"}, {"name": "洋葱", "amount": 1, "unit": "个"}, {"name": "青柠", "amount": 2, "unit": "个"}, {"name": "香菜", "amount": 15, "unit": "g"}, {"name": "孜然粉", "amount": 1, "unit": "茶匙"}, {"name": "辣椒粉", "amount": 1, "unit": "茶匙"}, {"name": "蒜", "amount": 3, "unit": "瓣"}, {"name": "酸奶油", "amount": 100, "unit": "ml"}, {"name": "盐", "amount": 1, "unit": "茶匙"}]),
    steps: JSON.stringify(["洋葱一半切末一半切丁番茄去籽切丁香菜切碎", "牛油果压泥加青柠汁盐洋葱丁", "莎莎酱：番茄丁洋葱丁香菜青柠汁盐辣椒碎拌匀", "炒洋葱末蒜末加牛绞肉翻炒变色", "加孜然粉辣椒粉盐和水中火5分钟收汁", "玉米饼干锅加热30秒每面", "组装：玉米饼铺牛油果泥加牛肉馅浇莎莎酱酸奶油", "配青柠角上桌"]),
    nutrition: JSON.stringify({"calories": 380, "protein": 26, "fat": 22, "carbs": 24, "fiber": 5, "sodium": 640}),
    story: '墨西哥塔可(Taco)是世界文化遗产级别的街头美食。考古发现墨西哥谷地早在公元前500年就有用玉米饼包裹食物的传统。每年3月31日是国际塔可日。',
    culturalBackground: '塔可代表墨西哥街头饮食的灵魂。玉米饼的品质和馅料是两大关键。墨西哥人吃塔可必配青柠和不同辣度的莎莎酱。传统左手托饼右手加料弯腰咬第一口不让汁水滴落。',
    tips: '玉米饼过火即可不要烤脆；牛绞肉炒时加少许水让肉汁更丰富；牛油果泥加青柠汁防氧化；所有配料准备齐了再组装',
    categoryTags: JSON.stringify({"ingredient": "beef-corn", "method": "grill", "cuisine": "mexican", "flavor": "spicy", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：牛油果酱 ──
  {
    id: uuidv4(),
    title: '牛油果酱',
    coverImage: 'https://images.unsplash.com/photo-1527502588293-f158f12ccd1a?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 10,
    description: '墨西哥经典蘸酱，熟透牛油果搭配番茄洋葱香菜，酸辣适中，配玉米片或做塔可伴侣。',
    category: 'mexican',
    difficulty: 'easy',
    season: 'summer',
    servings: 4,
    ingredients: JSON.stringify([{"name": "牛油果", "amount": 2, "unit": "个"}, {"name": "番茄", "amount": 1, "unit": "个"}, {"name": "洋葱", "amount": 0.5, "unit": "个"}, {"name": "青柠", "amount": 2, "unit": "个"}, {"name": "香菜", "amount": 15, "unit": "g"}, {"name": "墨西哥辣椒", "amount": 1, "unit": "个"}, {"name": "盐", "amount": 0.5, "unit": "茶匙"}, {"name": "黑胡椒", "amount": 0.25, "unit": "茶匙"}]),
    steps: JSON.stringify(["牛油果对半切去核用小刀划方格用勺挖出果肉", "番茄去籽切细丁洋葱切极细末香菜切碎辣椒切碎", "柠檬榨汁", "用叉子将牛油果压成粗泥保留少许果肉块", "加入番茄丁洋葱末香菜碎辣椒碎", "加青柠汁盐黑胡椒拌匀", "尝味调整酸度和咸度", "盖保鲜膜贴面冷藏30分钟防氧化后上桌"]),
    nutrition: JSON.stringify({"calories": 160, "protein": 2, "fat": 14, "carbs": 9, "fiber": 7, "sodium": 300}),
    story: '牛油果酱(Guacamole)源自阿兹特克文明。纳瓦特尔语ahuacamolli由ahuacatl(牛油果)和molli(酱汁)构成。阿兹特克人早在15世纪就开始食用这道酱。',
    culturalBackground: '在墨西哥，Guacamole是家庭聚会必备品，地位相当于中国的花生米。品质只用成熟牛油果和简单食材判断。加奶油或蛋黄酱在墨西哥人眼中是异端。',
    tips: '牛油果必须完全熟透；保留部分果肉块增口感；青柠汁不仅调味更防氧化；做好后立即覆保鲜膜贴面冷藏减少接触氧气',
    categoryTags: JSON.stringify({"ingredient": "avocado-vegetables", "method": "raw", "cuisine": "mexican", "flavor": "tangy-creamy", "price": "low"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：墨西哥玉米卷饼 ──
  {
    id: uuidv4(),
    title: '墨西哥玉米卷饼',
    coverImage: 'https://images.unsplash.com/photo-1577105333069-6c69bcedcb0d?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 40,
    description: '墨西哥暖心烤卷，软玉米饼包裹香料鸡肉和奶酪，浇上浓郁红酱焗烤至芝士冒泡。',
    category: 'mexican',
    difficulty: 'medium',
    season: 'winter',
    servings: 4,
    ingredients: JSON.stringify([{"name": "鸡胸肉", "amount": 400, "unit": "g"}, {"name": "玉米饼", "amount": 8, "unit": "张"}, {"name": "切达芝士", "amount": 150, "unit": "g"}, {"name": "番茄罐头", "amount": 400, "unit": "g"}, {"name": "洋葱", "amount": 1, "unit": "个"}, {"name": "蒜", "amount": 3, "unit": "瓣"}, {"name": "孜然粉", "amount": 1, "unit": "茶匙"}, {"name": "辣椒粉", "amount": 1, "unit": "茶匙"}, {"name": "牛至", "amount": 0.5, "unit": "茶匙"}, {"name": "酸奶油", "amount": 100, "unit": "ml"}, {"name": "橄榄油", "amount": 2, "unit": "勺"}, {"name": "盐", "amount": 1, "unit": "茶匙"}]),
    steps: JSON.stringify(["鸡胸肉加盐胡椒煎至两面金黄撕成细丝", "炒洋葱蒜末加孜然辣椒粉牛至倒番茄罐头小火煮15分钟至浓稠", "烤箱预热190度", "玉米饼稍加热变软", "每张饼铺上鸡丝和芝士碎卷紧收口朝下", "烤盘底部铺一层红酱摆入卷饼", "浇剩余红酱撒剩余芝士碎", "烤15-20分钟至芝士冒泡金黄配酸奶油上桌"]),
    nutrition: JSON.stringify({"calories": 450, "protein": 34, "fat": 18, "carbs": 36, "fiber": 4, "sodium": 780}),
    story: '墨西哥玉米卷饼(Enchilada)起源于墨西哥，历史可追溯至玛雅文明时期。Enchilada来自西班牙语enchilar(加辣椒)。最初是玉米饼包裹简单馅料浇辣椒酱食用。',
    culturalBackground: '墨西哥家庭聚餐中Enchilada是周日午餐经典选择。红酱是灵魂每个家庭有秘方。北部多肉少酱，南部酱料浓稠香料丰富。传统用玉米饼而非面粉饼。',
    tips: '玉米饼先稍加热再卷防断裂；红酱可提前做好冷藏保存3天；鸡肉换牛肉或黑豆都好吃；烤好后静置5分钟再切块更整齐',
    categoryTags: JSON.stringify({"ingredient": "chicken-cheese", "method": "bake", "cuisine": "mexican", "flavor": "spicy-rich", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：法式马卡龙 ──
  {
    id: uuidv4(),
    title: '法式马卡龙',
    coverImage: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 90,
    description: '法式经典甜点，酥脆外壳包裹绵软内芯，夹入丝滑甘纳许，是甜品界的奢侈品。',
    category: 'dessert',
    difficulty: 'hard',
    season: 'spring',
    servings: 20,
    ingredients: JSON.stringify([{"name": "杏仁粉", "amount": 100, "unit": "g"}, {"name": "糖粉", "amount": 100, "unit": "g"}, {"name": "蛋白", "amount": 2, "unit": "个"}, {"name": "细砂糖", "amount": 30, "unit": "g"}, {"name": "蛋白粉", "amount": 0.5, "unit": "茶匙"}, {"name": "食用色素", "amount": 2, "unit": "滴"}, {"name": "淡奶油", "amount": 80, "unit": "ml"}, {"name": "黑巧克力", "amount": 80, "unit": "g"}]),
    steps: JSON.stringify(["杏仁粉和糖粉一起过筛两次备用", "蛋白室温回温加蛋白粉分次加细砂糖打至硬性发泡", "加食用色素轻拌", "粉类分两次拌入蛋白霜J字翻拌至缎带状飘落约40次", "裱花袋装圆形嘴挤3cm圆饼", "轻震烤盘室温静置30-60分钟至不粘手", "烤箱预热150度烤14分钟中途开门放气", "完全放凉后配对", "淡奶油煮沸倒入切碎巧克力静置2分钟搅匀放凉做甘纳许", "挤在饼干片上合拢冷藏过夜回潮"]),
    nutrition: JSON.stringify({"calories": 85, "protein": 2, "fat": 5, "carbs": 10, "fiber": 0.5, "sodium": 10}),
    story: '马卡龙(Macaron)起源于16世纪意大利文艺复兴时期。1533年美第奇家族的凯瑟琳嫁给法国亨利二世时从意大利带到法国。现代夹心马卡龙由巴黎Laduree甜点师Pierre Desfontaines在20世纪初创造。',
    culturalBackground: '马卡龙在法国甜品界如爱马仕般地位。每年3月20日是马卡龙日。能否做出完美马卡龙是衡量甜点师水平的试金石。外壳薄脆有均匀裙边、内芯绵软略有嚼劲是评判标准。',
    tips: '蛋白必须室温且无油无水；翻拌手法决定成败；静置结皮不可省略否则开裂；冷藏过夜回潮是口感最佳秘诀',
    categoryTags: JSON.stringify({"ingredient": "almond-egg", "method": "bake", "cuisine": "french", "flavor": "sweet", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
  },
  // ── #83 新增：日式舒芙蕾芝士蛋糕 ──
  {
    id: uuidv4(),
    title: '日式舒芙蕾芝士蛋糕',
    coverImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop',
    author: '美食达人',
    cookTime: 70,
    description: '日式轻芝士蛋糕，如云朵般轻盈绵软，入口即化，芝士味浓郁却不腻口。',
    category: 'dessert',
    difficulty: 'medium',
    season: 'spring',
    servings: 8,
    ingredients: JSON.stringify([{"name": "奶油芝士", "amount": 250, "unit": "g"}, {"name": "黄油", "amount": 30, "unit": "g"}, {"name": "蛋黄", "amount": 3, "unit": "个"}, {"name": "细砂糖", "amount": 60, "unit": "g"}, {"name": "低筋面粉", "amount": 30, "unit": "g"}, {"name": "玉米淀粉", "amount": 15, "unit": "g"}, {"name": "牛奶", "amount": 100, "unit": "ml"}, {"name": "蛋清", "amount": 3, "unit": "个"}, {"name": "柠檬汁", "amount": 5, "unit": "ml"}, {"name": "香草精", "amount": 3, "unit": "滴"}]),
    steps: JSON.stringify(["奶油芝士和黄油提前室温软化", "蛋黄加一半糖打至泛白浓稠", "筛入低筋面粉和玉米淀粉拌匀", "牛奶加热至微沸缓慢倒入蛋黄糊不停搅拌", "奶油芝士打顺滑后分次加入蛋黄牛奶糊拌匀", "蛋清加柠檬汁和剩下糖打至湿性发泡大弯钩", "蛋白霜分三次翻拌入芝士糊", "模具垫油纸倒入面糊", "烤盘倒热水烤箱160度烤20分钟转140度烤40分钟", "关火烤箱门留缝静置15分钟取出冷藏4小时以上"]),
    nutrition: JSON.stringify({"calories": 240, "protein": 8, "fat": 16, "carbs": 18, "fiber": 0.5, "sodium": 260}),
    story: '日式舒芙蕾芝士蛋糕(Japanese Souffle Cheesecake)是日本甜品创新的杰作。1987年东京甜品师Kazunori Kanda受法式舒芙蕾灵感启发，在芝士蛋糕中加入打发蛋白霜，创造出像云一样轻盈的蛋糕。',
    culturalBackground: '日式轻芝士蛋糕代表日本对西方甜品的减法美学。相比西方芝士蛋糕的浓郁厚重，通过水浴法低温慢烤和蛋白霜蓬发力达到极致轻盈口感，代表日本烘焙的最高水准。',
    tips: '水浴法热水不要超过模具一半高度；蛋白绝不能打过湿性发泡即可；翻拌控制在20次以内防消泡；冷藏过夜回油后口感更绵密湿润',
    categoryTags: JSON.stringify({"ingredient": "cheese-egg", "method": "bake", "cuisine": "japanese", "flavor": "sweet-creamy", "price": "medium"}),
    favoriteCount: 0, viewCount: 0, isFeatured: false
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

  { title: '越南春卷', videos: [
    { url: 'https://www.bilibili.com/video/BV1GJ411v7WU', platform: 'bilibili', title: '越南春卷制作教程 鲜虾生菜，清爽不油腻', duration: 360, sortOrder: 0 },
  ]},
  { title: '越南牛肉粉', videos: [
    { url: 'https://www.bilibili.com/video/BV1KJ411s7J2', platform: 'bilibili', title: '正宗越南牛肉粉Pho教程，汤底鲜美', duration: 420, sortOrder: 0 },
  ]},
  { title: '印度黄油鸡', videos: [
    { url: 'https://www.bilibili.com/video/BV12J411j7Dk', platform: 'bilibili', title: '印度黄油鸡最正宗做法，奶油咖喱绝了', duration: 480, sortOrder: 0 },
  ]},
  { title: '希腊沙拉', videos: [
    { url: 'https://www.bilibili.com/video/BV1GJ41167Wk', platform: 'bilibili', title: '正宗希腊沙拉做法 地中海饮食经典', duration: 300, sortOrder: 0 },
  ]},
  { title: '鹰嘴豆泥', videos: [
    { url: 'https://www.bilibili.com/video/BV1KJ411j7Kj', platform: 'bilibili', title: '自制鹰嘴豆泥，丝滑浓郁超简单', duration: 240, sortOrder: 0 },
  ]},
  { title: '西班牙海鲜饭', videos: [
    { url: 'https://www.bilibili.com/video/BV1PJ411s7Jk', platform: 'bilibili', title: '西班牙海鲜饭Paella在家做，藏红花金黄米饭', duration: 540, sortOrder: 0 },
  ]},
  { title: '墨西哥塔可', videos: [
    { url: 'https://www.bilibili.com/video/BV1HJ41167Ds', platform: 'bilibili', title: '墨西哥塔可超详细教程 经典街头美食', duration: 360, sortOrder: 0 },
  ]},
  { title: '牛油果酱', videos: [
    { url: 'https://www.bilibili.com/video/BV1KJ41157Dj', platform: 'bilibili', title: '正宗Guacamole牛油果酱，墨西哥经典蘸酱', duration: 180, sortOrder: 0 },
  ]},
  { title: '墨西哥玉米卷饼', videos: [
    { url: 'https://www.bilibili.com/video/BV1HJ41157Kk', platform: 'bilibili', title: '墨西哥焗烤玉米卷饼Enchilada做法', duration: 420, sortOrder: 0 },
  ]},
  { title: '法式马卡龙', videos: [
    { url: 'https://www.bilibili.com/video/BV1j741117Bd', platform: 'bilibili', title: '法式马卡龙零失败教程，完美裙边秘诀', duration: 600, sortOrder: 0 },
  ]},
  { title: '日式舒芙蕾芝士蛋糕', videos: [
    { url: 'https://www.bilibili.com/video/BV1e7411k7Bd', platform: 'bilibili', title: '日式舒芙蕾芝士蛋糕 云朵般轻盈口感', duration: 480, sortOrder: 0 },
  ]},
]
// ── 挑战赛数据 ──────────────────────────────────────────────────
const challenges = [
  {
    id: uuidv4(),
    title: '夏日清爽料理大赛',
    description: '炎炎夏日，来一道清爽开胃的料理吧！凉拌沙拉、冰镇甜品、清蒸时蔬……只要够清爽够夏天，就来投稿展示你的夏日厨艺！',
    theme: '夏日凉菜',
    status: 'active',
    startDate: new Date('2026-06-01T00:00:00Z'),
    endDate: new Date('2026-07-15T23:59:59Z'),
    rules: '1. 食谱需为夏日清爽主题（凉拌/冰镇/清蒸/冷食等）\n2. 附上成品照片和完整步骤说明\n3. 鼓励附上清凉故事或夏日灵感来源',
    prize: '🥇 第一名：厨具套装 + 首页推荐\n🥈 第二名：精美餐盘套装\n🥉 第三名：食谱手账本',
    submissionCount: 0,
    voteCount: 0,
    createdBy: null,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '一周快手菜挑战',
    description: '忙碌的生活中，你有哪些30分钟内搞定的快手菜秘诀？分享你的高效烹饪魔法，让更多打工人学会快速吃好！',
    theme: '快手菜',
    status: 'active',
    startDate: new Date('2026-05-28T00:00:00Z'),
    endDate: new Date('2026-06-20T23:59:59Z'),
    rules: '1. 烹饪总时长不超过30分钟\n2. 食材需简单易得（超市常见食材即可）\n3. 请注明总用时和食材获取难度',
    prize: '🏆 最快速手奖：保温饭盒 + 厨房计时器\n🥇 最佳人气奖：品牌厨具套装',
    submissionCount: 0,
    voteCount: 0,
    createdBy: null,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '家乡味道征集赛',
    description: '走遍天涯海角，最难忘的还是家乡的那一口。分享你记忆中那道最温暖的家乡菜，让美味承载的故事继续传递！',
    theme: '地方特色',
    status: 'active',
    startDate: new Date('2026-06-15T00:00:00Z'),
    endDate: new Date('2026-07-31T23:59:59Z'),
    rules: '1. 食谱需带有地方特色（注明菜系或地区）\n2. 附上这道菜背后的故事或记忆\n3. 鼓励还原正宗做法，也可创意改良',
    prize: '🥇 最佳故事奖：定制围裙 + 美食书\n🥈 最佳还原奖：厨具礼包\n🥉 人气奖：品牌调味品套装',
    submissionCount: 0,
    voteCount: 0,
    createdBy: null,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '创意早餐挑战',
    description: '一日之计在于晨！分享你的创意早餐灵感——松饼艺术、卡通便当、营养碗、快手三明治……让早餐成为一天中最美好的开始！',
    theme: '早餐',
    status: 'active',
    startDate: new Date('2026-06-10T00:00:00Z'),
    endDate: new Date('2026-07-20T23:59:59Z'),
    rules: '1. 作品需为早餐类食品\n2. 鼓励创意摆盘和营养搭配\n3. 附上准备时间和营养说明',
    prize: '🎨 最佳创意奖：早餐神器三件套\n🥇 最受欢迎奖：品牌咖啡杯套装\n📖 参与奖：电子食谱合集',
    submissionCount: 0,
    voteCount: 0,
    createdBy: null,
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    title: '深夜食堂故事征集',
    description: '夜深人静时的美食总是别有风味。分享你的深夜美食故事和食谱，在月光下品味人间烟火！',
    theme: '夜宵',
    status: 'active',
    startDate: new Date('2026-07-01T00:00:00Z'),
    endDate: new Date('2026-08-15T23:59:59Z'),
    rules: '1. 食谱适合深夜制作（简单快捷为佳）\n2. 附上深夜美食故事或场景\n3. 鼓励分享配酒/饮品推荐',
    prize: '🌙 最佳故事奖：夜空主题餐垫\n🍜 最佳食谱奖：特色面碗套装\n🏅 参与奖：社区荣誉徽章',
    submissionCount: 0,
    voteCount: 0,
    createdBy: null,
    createdAt: new Date(),
  },
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

    // ── 插入挑战赛数据 ────────────
    if (challenges.length > 0) {
      await db.Challenge.bulkCreate(challenges)
      console.log(`✅ 成功插入 ${challenges.length} 条挑战赛记录`)
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