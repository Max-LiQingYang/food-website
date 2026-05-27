'use strict'

/**
 * utils/ingredientAliases.js
 * 食材别名映射表 — 解决"番茄"找不到"西红柿"的问题
 *
 * 每个条目格式：[规范名, ...别名列表]
 * 规范名通常是食谱中更常用的名称
 */

// 别名映射：所有别名 → 规范名
const ALIAS_TO_CANONICAL = {}
// 别名映射：规范名 → 所有别名（含自身）
const CANONICAL_TO_ALIASES = {}

// 每组别名 [规范名, 别名1, 别名2, ...]
const ALIAS_GROUPS = [
  ['番茄', '西红柿', '蕃茄'],
  ['土豆', '马铃薯', '洋芋'],
  ['生抽', '酱油', '豉油'],
  ['老抽', '黑酱油'],
  ['淀粉', '生粉', '芡粉', '太白粉', '玉米淀粉'],
  ['黄瓜', '青瓜', '胡瓜'],
  ['茄子', '茄瓜', '矮瓜'],
  ['白菜', '卷心菜', '包菜', '洋白菜', '高丽菜', '甘蓝'],
  ['花菜', '菜花', '花椰菜'],
  ['西兰花', '青花菜', '绿花椰'],
  ['红薯', '地瓜', '番薯', '甘薯'],
  ['山药', '淮山', '薯蓣'],
  ['洋葱', '洋蔥', '圆葱'],
  ['花生', '落花生', '地豆'],
  ['黄豆', '大豆', '毛豆（嫩）'],
  ['四季豆', '菜豆', '芸豆', '豆角'],
  ['糖', '白砂糖', '蔗糖', '白糖'],
  ['葱', '青葱', '小葱', '香葱', '大葱'],
  ['香菜', '芫荽', '香荽'],
  ['生菜', '莴苣', '油麦菜'],
  ['菠菜', '菠薐', '赤根菜'],
  ['木耳', '黑木耳', '云耳'],
  ['香菇', '冬菇', '香蕈', '花菇'],
  ['金针菇', '金菇', '金针'],
  ['虾', '虾仁', '海虾', '明虾', '对虾'],
  ['猪肉', '猪五花', '瘦肉', '猪里脊'],
  ['牛肉', '牛腩', '牛腱', '牛里脊'],
  ['鸡肉', '鸡胸肉', '鸡腿肉', '鸡翅'],
  ['鸡蛋', '鸡子', '鸡卵'],
  ['黄油', '牛油', '奶油（无盐）'],
  ['奶酪', '芝士', '起司', '乳酪'],
  ['橄榄油', '橄榄油（特级初榨）'],
  ['醋', '陈醋', '香醋', '米醋', '白醋'],
  ['料酒', '黄酒', '米酒', '绍兴酒'],
  ['耗油', '蚝油'],
  ['姜', '生姜', '生姜片', '老姜'],
  ['蒜', '大蒜', '蒜头'],
  ['辣椒', '干辣椒', '辣椒面', '辣椒粉'],
  ['花椒', '麻椒', '花椒粉'],
  ['豆腐', '嫩豆腐', '老豆腐', '豆腐干'],
  ['牛奶', '鲜奶', '纯奶'],
  ['面粉', '中筋面粉', '高筋面粉', '低筋面粉', '普通面粉'],
  ['大米', '白米', '粳米', '籼米'],
  ['糯米', '江米', '糯小米'],
  ['芝麻', '白芝麻', '黑芝麻', '芝麻粒'],
  ['紫菜', '海苔'],
  ['海带', '昆布', '海藻'],
  ['茼蒿', '蒿子杆', '蓬蒿'],
  ['芹菜', '西芹', '芹'],
  ['菜椒', '甜椒', '青椒', '灯笼椒'],
  ['红椒', '红辣椒', '红甜椒'],
  ['玉米', '甜玉米', '玉蜀黍', '棒子'],
  ['苏打粉', '小苏打', '碳酸氢钠'],
  ['泡打粉', '发酵粉', '膨松剂'],
  ['酵母', '酵母粉', '干酵母'],
  ['桂皮', '肉桂', '玉桂'],
  ['八角', '大料', '八角茴香', '大茴香'],
  ['月桂叶', '香叶', '桂叶'],
  ['孜然', '小茴香', '安息茴香'],
  ['小茴香籽', '茴香粒'],
  ['咖喱', '咖喱粉', '咖喱酱'],
  ['豆瓣酱', '辣豆瓣酱', '郫县豆瓣'],
  ['甜面酱', '甜酱'],
  ['番茄酱', '蕃茄酱', '茄汁'],
  ['豆芽', '豆芽菜', '绿豆芽', '黄豆芽'],
  ['薄荷', '薄荷叶'],
  ['罗勒', '九层塔', '紫苏（西式）', '金不换'],
  ['迷迭香', '迷迭香叶'],
  ['百里香', '麝香草'],
  ['柠檬', '柠檬汁', '柠檬皮'],
  ['椰奶', '椰浆', '椰子奶'],
  ['奶油', '稀奶油', '淡奶油', '鲜奶油'],
  ['炼乳', '炼奶', '浓缩奶'],
  ['面粉', '小麦粉'],
  ['澄粉', '澄面', '小麦淀粉'],
  ['绿豆', '绿豆粒'],
  ['红豆', '赤小豆', '红小豆'],
  ['果糖', '果葡糖浆'],
  ['蜂蜜', '蜜糖'],
  ['面筋', '面筋块', '油面筋'],
  ['腐竹', '豆腐皮', '腐皮'],
  ['花椒油', '花椒油（藤椒油）'],
  ['辣椒油', '红油', '油泼辣子'],

  // ── 第3轮：扩展肉类/水产 ──
  ['鱼', '草鱼', '鲈鱼', '鲫鱼', '罗非鱼', '三文鱼', '鳕鱼', '鱼片', '鱼块', '鱼肉', '龙利鱼'],
  ['羊肉', '羊腿', '羊排', '羊肉片', '羊腩', '羊里脊'],
  ['鸭', '鸭肉', '鸭腿', '鸭翅', '鸭胸', '烤鸭'],

  // ── 第4轮：豆制品/蔬菜扩展 ──
  ['豆腐', '嫩豆腐', '老豆腐', '豆腐干', '千张', '豆制品'],
  ['青椒', '甜椒', '灯笼椒', '菜椒', '彩椒', '柿子椒'],
  ['辣椒', '红辣椒', '干辣椒', '小米辣', '尖椒', '杭椒', '青尖椒'],
  ['姜', '生姜', '老姜', '嫩姜', '子姜', '姜片', '姜末'],
  ['蒜', '大蒜', '蒜头', '蒜瓣', '蒜末', '蒜片'],
  ['胡萝卜', '红萝卜', '甘荀', '胡萝贝'],
  ['芹菜', '西芹', '旱芹', '香芹'],
  ['南瓜', '南瓜泥', '金瓜', '老南瓜', '嫩南瓜'],
  ['韭菜', '韭黄', '韭葱', '韭菜苔'],
  ['豆芽', '绿豆芽', '黄豆芽', '银芽'],
  ['玉米', '甜玉米', '玉米粒', '玉米笋', '玉米棒'],

  // ── 第5轮：米面/干货 ──
  ['面条', '挂面', '切面', '拉面', '乌冬面', '意面', '意大利面', '通心粉', '意粉', '细面'],
  ['大米', '白米', '米饭', '粳米', '籼米', '香米'],
  ['糯米', '糯米粉', '江米', '糯米饭'],
  ['面粉', '中筋面粉', '高筋面粉', '低筋面粉', '普通面粉', '小麦粉', '中粉', '高粉', '低粉'],
  ['酵母', '干酵母', '发酵粉', '泡打粉', '即发干酵母'],
  ['面包糠', '面包屑', '面包粉', '酥炸粉'],
  ['紫菜', '海苔', '紫菜片'],
  ['红枣', '大枣', '金丝枣', '红枣干', '去核红枣'],
  ['枸杞', '枸杞子', '杞子'],
  ['莲子', '莲子干', '白莲'],
  ['百合', '百合干', '鲜百合'],

  // ── 第6轮：调味品扩展 ──
  ['料酒', '米酒', '黄酒', '绍兴酒', '料理酒', '花雕酒'],
  ['香油', '芝麻油', '麻油', '香油（麻油）'],
  ['蚝油', '蚝油酱'],
  ['豆瓣酱', '辣豆瓣酱', '郫县豆瓣酱', '豆瓣'],
  ['咖喱', '咖喱粉', '咖喱块', '咖喱酱', '咖喱膏'],
  ['桂皮', '肉桂', '肉桂粉', '桂枝'],
  ['牛奶', '鲜奶', '全脂牛奶', '纯牛奶', '牛奶（全脂）'],
  ['八角', '大料', '八角茴香'],
  ['花椒', '麻椒', '藤椒', '青花椒', '红花椒'],
  ['白芝麻', '芝麻', '熟芝麻', '白芝麻粒'],
]

// 构建双向映射
for (const group of ALIAS_GROUPS) {
  const canonical = group[0]
  const allNames = [...group]
  CANONICAL_TO_ALIASES[canonical] = allNames
  for (const name of allNames) {
    // 如果已有映射则保留第一个（更常用的那个）
    if (!ALIAS_TO_CANONICAL[name]) {
      ALIAS_TO_CANONICAL[name] = canonical
    }
  }
}

/**
 * 将用户输入的食材转为规范化名称列表
 * @param {string[]} inputList — 用户输入的食材名数组
 * @returns {string[]} — 规范化后的食材名列表（含原输入名 + 别名展开）
 */
function expandIngredients(inputList) {
  const result = new Set() // 去重

  for (const item of inputList) {
    const trimmed = item.trim().toLowerCase()
    if (!trimmed) continue

    // 保留原输入
    result.add(trimmed)

    // 查找别名组的规范名
    const canonical = ALIAS_TO_CANONICAL[trimmed]
    if (canonical) {
      // 展开该组内所有别名
      for (const alias of CANONICAL_TO_ALIASES[canonical]) {
        result.add(alias.toLowerCase())
      }
    }

    // 也尝试不区分大小写的精确匹配（对于非小写映射键）
    for (const [mapKey, canonicalName] of Object.entries(ALIAS_TO_CANONICAL)) {
      if (mapKey.toLowerCase() === trimmed) {
        for (const alias of CANONICAL_TO_ALIASES[canonicalName]) {
          result.add(alias.toLowerCase())
        }
        break
      }
    }
  }

  return [...result]
}

/**
 * 获取所有规范名（用于前端自动建议）
 * @returns {string[]} — 所有常见食材规范名
 */
function getAllCanonicalNames() {
  return Object.keys(CANONICAL_TO_ALIASES).sort()
}

/**
 * 获取热门食材列表（常见的前 N 个）
 * @param {number} limit
 * @returns {string[]}
 */
function getHotIngredients(limit = 20) {
  const hot = [
    '鸡蛋', '番茄', '土豆', '洋葱', '胡萝卜',
    '鸡肉', '猪肉', '牛肉', '虾', '豆腐',
    '番茄', '酱油', '盐', '糖', '料酒',
    '姜', '蒜', '葱', '辣椒', '青椒',
    '面条', '大米', '面粉', '玉米', '黄瓜',
    '香菇', '木耳', '白菜', '菠菜', '西兰花',
  ]
  return hot.slice(0, limit)
}

/**
 * 别名感知匹配：判断用户搜索的食材是否与食谱中的某种食材匹配
 * @param {string} searchTerm — 用户输入的搜索词
 * @param {string[]} recipeIngredientNames — 食谱中的食材名数组
 * @returns {{ matched: boolean, matchedName: string|null }} — 是否匹配 + 匹配到的食材名
 */
function matchIngredient(searchTerm, recipeIngredientNames) {
  const trimmed = searchTerm.trim().toLowerCase()
  if (!trimmed) return { matched: false, matchedName: null }

  for (const recipeIngredient of recipeIngredientNames) {
    const name = String(recipeIngredient).toLowerCase()

    // 1. 精确子串匹配（最高优先级）
    if (name.includes(trimmed) || trimmed.includes(name)) {
      return { matched: true, matchedName: recipeIngredient }
    }

    // 2. 别名映射匹配
    const canonical = ALIAS_TO_CANONICAL[trimmed]
    if (canonical) {
      // 看食谱食材是否属于该别名组
      for (const alias of CANONICAL_TO_ALIASES[canonical]) {
        if (name.includes(alias.toLowerCase())) {
          return { matched: true, matchedName: recipeIngredient }
        }
      }
    }

    // 3. 反向：食谱中的食材是否有别名映射到搜索词
    const canonicalReverse = ALIAS_TO_CANONICAL[name]
    if (canonicalReverse) {
      for (const alias of CANONICAL_TO_ALIASES[canonicalReverse]) {
        if (alias.toLowerCase().includes(trimmed) || trimmed.includes(alias.toLowerCase())) {
          return { matched: true, matchedName: recipeIngredient }
        }
      }
    }

    // 4. 部分匹配：搜索词的一部分匹配食谱食材
    // 处理如 "鸡" → "鸡腿" 的场景（搜索词是食材名的一部分）
    if (trimmed.length >= 2 && (name.includes(trimmed) || trimmed.includes(name))) {
      return { matched: true, matchedName: recipeIngredient }
    }
  }

  return { matched: false, matchedName: null }
}

/**
 * 对输入食材列表批量展开别名
 * @param {string[]} terms — 用户输入的食材列表
 * @returns {string[]} — 展开后的搜索词列表（去重）
 */
function expandSearchTerms(terms) {
  return expandIngredients(terms)
}

module.exports = {
  expandIngredients,
  getAllCanonicalNames,
  getHotIngredients,
  matchIngredient,
  expandSearchTerms,
  ALIAS_GROUPS,
  ALIAS_TO_CANONICAL,
  CANONICAL_TO_ALIASES,
}