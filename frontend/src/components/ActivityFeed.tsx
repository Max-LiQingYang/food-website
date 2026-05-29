import { useNavigate } from 'react-router-dom'
import './ActivityFeed.css'

// ── Types ──

export interface ActivityUser {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

export interface RecipeInfo {
  title: string
  coverImage?: string
}

export interface ActivityItem {
  id: number
  type: 'create_recipe' | 'comment' | 'favorite' | 'follow' | 'review' | 'work'
  userId: string
  targetId: string | null
  targetType: string | null
  extra: Record<string, any> | null
  createdAt: string
  user: ActivityUser | null
  recipeInfo: RecipeInfo | null
}

export interface ActivityFeedProps {
  activities: ActivityItem[]
  loading?: boolean
}

// ── Constants ──

const TYPE_CONFIG: Record<string, { emoji: string; action: string }> = {
  create_recipe: { emoji: '🆕', action: '发布了食谱' },
  comment: { emoji: '💬', action: '评论了食谱' },
  favorite: { emoji: '❤️', action: '收藏了食谱' },
  follow: { emoji: '👤', action: '关注了' },
  review: { emoji: '⭐', action: '评价了食谱' },
  work: { emoji: '📷', action: '上传了作品' },
}

// ── Helpers ──

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`

  const days = Math.floor(diff / 86400)
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
}

function getDisplayName(user: ActivityUser | null): string {
  if (!user) return '未知用户'
  return user.nickname || user.username
}

function getAvatarLetter(user: ActivityUser | null): string {
  const name = getDisplayName(user)
  return name.charAt(0).toUpperCase()
}

function getRecipeTitle(item: ActivityItem): string {
  if (item.recipeInfo?.title) return item.recipeInfo.title
  if (item.type === 'work' && item.extra?.recipeTitle) return item.extra.recipeTitle
  return '未知食谱'
}

function getRecipeCover(item: ActivityItem): string | undefined {
  return item.recipeInfo?.coverImage || undefined
}

function getNavigateTarget(item: ActivityItem): string | null {
  if (item.type === 'work') {
    // work 类型的 targetId 是 commentId，通过 extra.recipeId 获取食谱
    const recipeId = item.extra?.recipeId || null
    if (recipeId) return `/recipe/${recipeId}`
    // fallback: 如果没有 recipeId，尝试 targetId
    if (item.targetId) return `/recipe/${item.targetId}`
    return null
  }
  // 其他类型：targetId 就是 recipeId
  if (item.targetId) return `/recipe/${item.targetId}`
  return null
}

// ── ActivityCard Component ──

function ActivityCard({ item }: { item: ActivityItem }) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[item.type] || { emoji: '📌', action: '操作了' }
  const coverUrl = getRecipeCover(item)
  const navTarget = getNavigateTarget(item)

  const handleClick = () => {
    if (navTarget) navigate(navTarget)
  }

  return (
    <div className="activity-card" onClick={handleClick} role="button" tabIndex={0}>
      {/* Avatar + Type Badge */}
      <div className="activity-card__avatar-wrap">
        {item.user?.avatar ? (
          <img className="activity-card__avatar" src={item.user.avatar} alt="" />
        ) : (
          <div className="activity-card__avatar-placeholder">{getAvatarLetter(item.user)}</div>
        )}
        <span className="activity-card__type-badge">{config.emoji}</span>
      </div>

      {/* Body */}
      <div className="activity-card__body">
        <div className="activity-card__user-row">
          <span className="activity-card__username">{getDisplayName(item.user)}</span>
          <span className="activity-card__action">
            {config.action}
            {' '}
            <span className="activity-card__recipe-title">{getRecipeTitle(item)}</span>
          </span>
        </div>
        <div className="activity-card__time">{formatRelativeTime(item.createdAt)}</div>
      </div>

      {/* Recipe Cover Thumbnail */}
      {coverUrl && (
        <img className="activity-card__cover" src={coverUrl} alt="" loading="lazy" />
      )}
    </div>
  )
}

// ── ActivityFeed Component ──

export default function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="activity-feed">
        <div className="activity-feed__header">
          <span className="activity-feed__title-icon">📡</span>
          <h3 className="activity-feed__title">关注动态</h3>
        </div>
        <div className="activity-feed__loading">
          <span className="spinner" />
        </div>
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return null
  }

  return (
    <div className="activity-feed">
      <div className="activity-feed__header">
        <span className="activity-feed__title-icon">📡</span>
        <h3 className="activity-feed__title">关注动态</h3>
      </div>
      {activities.map(item => (
        <ActivityCard key={item.id} item={item} />
      ))}
    </div>
  )
}
