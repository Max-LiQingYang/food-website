export type TimeCategory = 'quick' | 'normal' | 'slow'

export interface CookTimeInfo {
  category: TimeCategory
  icon: string
  label: string
  cssClass: string
}

export function getCookTimeInfo(cookTime: number): CookTimeInfo {
  if (cookTime <= 15) {
    return { category: 'quick', icon: '⚡', label: '快速', cssClass: 'recipe-card__tag--time-quick' }
  }
  if (cookTime <= 45) {
    return { category: 'normal', icon: '⏱', label: '普通', cssClass: 'recipe-card__tag--time-normal' }
  }
  return { category: 'slow', icon: '🍲', label: '慢炖', cssClass: 'recipe-card__tag--time-slow' }
}
