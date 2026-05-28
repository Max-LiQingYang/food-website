/** 分类定义：key → { label, icon, color, description } */
export interface CategoryInfo {
  key: string
  label: string
  icon: string
  color: string
  description: string
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'chinese',     label: '中餐',     icon: '🥟', color: '#e8663e', description: '中华传统美食，从家常小炒到宴客大菜' },
  { key: 'western',     label: '西餐',     icon: '🥩', color: '#c49a6c', description: '经典西式料理，牛排、意面与浓汤' },
  { key: 'japanese',    label: '日式',     icon: '🍣', color: '#7ab8b8', description: '和风料理，寿司、拉面与精致定食' },
  { key: 'korean',      label: '韩式',     icon: '🥬', color: '#d4856b', description: '韩流美食，泡菜、烤肉与石锅料理' },
  { key: 'dessert',     label: '甜品',     icon: '🍰', color: '#e8a0b4', description: '甜点烘焙，蛋糕、布丁与甜蜜时光' },
  { key: 'thai',        label: '泰式',     icon: '🍜', color: '#e67e22', description: '东南亚风情，冬阴功、咖喱与清爽沙拉' },
  { key: 'indian',      label: '印式',     icon: '🍛', color: '#d4a030', description: '印度风味，咖喱、烤饼与香料盛宴' },
  { key: 'vietnamese',  label: '越式',     icon: '🥗', color: '#27ae60', description: '越南美食，河粉、春卷与清新搭配' },
  { key: 'mexican',     label: '墨西哥',   icon: '🌮', color: '#2ecc71', description: '墨西哥热情，塔可、牛油果酱与辣椒风情' },
  { key: 'mediterranean', label: '地中海', icon: '🫒', color: '#3498db', description: '地中海健康饮食，橄榄油、海鲜与时蔬' },
]

/** 根据 key 查找分类信息 */
export function getCategoryInfo(key: string): CategoryInfo {
  return CATEGORIES.find(c => c.key === key) || {
    key,
    label: key,
    icon: '🍽️',
    color: '#8fbc8f',
    description: '',
  }
}

/** 分类 key → 中文名 */
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c.label])
)

/** 分类 key → 图标 */
export const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c.icon])
)

/** 分类 key → 颜色 */
export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.key, c.color])
)