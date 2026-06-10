import type { Recipe } from '../api'

type ContentBadgeKey = 'story' | 'culture' | 'tips' | 'video'

interface ContentBadgeItem {
  key: ContentBadgeKey
  icon: string
  label: string
  detail?: string
}

interface ContentBadgesProps {
  badges: ContentBadgeItem[]
}

export function getActiveBadges(recipe: Recipe): ContentBadgeItem[] {
  const badges: ContentBadgeItem[] = []
  if (recipe.story && recipe.story.trim().length > 0) {
    badges.push({ key: 'story', icon: '📖', label: '故事', detail: recipe.story.slice(0, 30) + '…' })
  }
  if (recipe.culturalBackground && recipe.culturalBackground.trim().length > 0) {
    badges.push({ key: 'culture', icon: '🌏', label: '文化', detail: recipe.culturalBackground.slice(0, 30) + '…' })
  }
  if (recipe.tips && recipe.tips.trim().length > 0) {
    badges.push({ key: 'tips', icon: '💡', label: '贴士', detail: recipe.tips.slice(0, 30) + '…' })
  }
  if ((recipe as any).videoCount > 0) {
    badges.push({ key: 'video', icon: '🎬', label: '视频' })
  }
  return badges
}

export default function ContentBadges({ badges }: ContentBadgesProps) {
  if (badges.length === 0) return null
  return (
    <div className="recipe-card__content-badges" role="list" aria-label="食谱内容丰富度">
      {badges.map(badge => (
        <span
          key={badge.key}
          className={`recipe-card__content-badge recipe-card__content-badge--${badge.key}`}
          role="listitem"
          title={badge.detail || badge.label}
        >
          <span className="recipe-card__content-badge-icon" aria-hidden="true">{badge.icon}</span>
          <span className="recipe-card__content-badge-label">{badge.label}</span>
        </span>
      ))}
    </div>
  )
}
