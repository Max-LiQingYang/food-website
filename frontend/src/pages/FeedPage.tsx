import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getActivityFeed, getUserStats, FeedActivityItem } from '../api'
import Skeleton from '../components/Skeleton'
import GlobalEmptyState from '../components/GlobalEmptyState'
import { useDeviceTier } from '../context/DeviceTierContext'
import './FeedPage.css'

// ── 活动类型配置 ──
const ACTIVITY_CONFIG: Record<string, { icon: string; action: string; color: string }> = {
  create_recipe: { icon: '🍳', action: '发布了新食谱', color: '#e8663e' },
  comment:        { icon: '💬', action: '评论了',     color: '#4a90d9' },
  favorite:       { icon: '❤️', action: '收藏了',     color: '#e74c3c' },
  review:         { icon: '⭐', action: '评分了',     color: '#f39c12' },
  work:           { icon: '📸', action: '分享了作品', color: '#27ae60' },
  follow:         { icon: '👤', action: '关注了',     color: '#8e44ad' },
}

// ── 相对时间 ──
function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// ── 星级渲染 ──
function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <span className="feed-star-rating" aria-label={`${rating} 星`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`feed-star ${i < full ? 'feed-star--filled' : 'feed-star--empty'}`}>
          {i < full ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

// ── 单个动态卡片 ──
function FeedCard({ item, isVisible }: { item: FeedActivityItem; isVisible?: boolean }) {
  const config = ACTIVITY_CONFIG[item.type] || { icon: '📌', action: '动态', color: '#888' }
  const user = item.user
  const recipe = item.recipeInfo
  const extra = item.extra

  // 评论内容预览
  const commentPreview = item.type === 'comment' && extra?.content
    ? (extra.content as string).slice(0, 120)
    : null

  // review 评分
  const reviewRating = item.type === 'review' && extra?.rating ? Number(extra.rating) : null

  // 食谱链接（优先 targetId，其次 extra.recipeId）
  const recipeId = item.targetType === 'recipe'
    ? item.targetId
    : (extra?.recipeId as string) || null

  return (
    <article className={`feed-card${isVisible ? ' feed-card--visible' : ''}`} data-feed-id={String(item.id)}>
      <div className="feed-card__avatar">
        {user?.avatar ? (
          <img src={user.avatar} alt={user.nickname || user.username} className="feed-card__avatar-img" />
        ) : (
          <span className="feed-card__avatar-fallback">
            {(user?.nickname || user?.username || '?')[0].toUpperCase()}
          </span>
        )}
      </div>
      <div className="feed-card__body">
        <div className="feed-card__header">
          <span className="feed-card__user">{user?.nickname || user?.username || '未知用户'}</span>
          <span className="feed-card__action" style={{ color: config.color }}>
            {config.icon} {config.action}
          </span>
          <span className="feed-card__time">{formatRelativeTime(item.createdAt)}</span>
        </div>

        {/* 食谱信息 */}
        {recipe && (
          <Link
            to={recipeId ? `/recipe/${recipeId}` : '#'}
            className="feed-card__recipe"
          >
            {recipe.coverImage && (
              <div className="feed-card__recipe-cover">
                <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
              </div>
            )}
            <span className="feed-card__recipe-title">{recipe.title}</span>
          </Link>
        )}

        {/* 评论内容 */}
        {commentPreview && (
          <p className="feed-card__comment-preview">“{commentPreview}{extra?.content?.length > 120 ? '...' : ''}”</p>
        )}

        {/* 评分星级 */}
        {reviewRating !== null && (
          <div className="feed-card__rating">
            <StarRating rating={reviewRating} />
          </div>
        )}

        {/* work 类型：作品信息 */}
        {item.type === 'work' && extra?.content && (
          <p className="feed-card__work-content">{(extra.content as string).slice(0, 150)}</p>
        )}
      </div>
    </article>
  )
}

// ── 骨架屏 ──
function FeedSkeleton() {
  return (
    <div className="feed-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="feed-skeleton__card">
          <Skeleton circle width={44} height={44} />
          <div className="feed-skeleton__body">
            <Skeleton width="60%" height={16} />
            <Skeleton width="80%" height={14} className="feed-skeleton__row2" />
            <Skeleton width="40%" height={12} className="feed-skeleton__row3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 页面组件 ──
export default function FeedPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState<FeedActivityItem[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ── J-003: network-error/load-fail counter 走页面 state（生命周期 = 页） ──
  const [feedRetryCount, setFeedRetryCount] = useState(0)
  const MAX_FEED_RETRIES = 3

  // 统计
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [followersCount, setFollowersCount] = useState<number | null>(null)

  // ── §4.2 卡片错峰动效 (J-005) ──
  const { isLowEnd } = useDeviceTier()
  const listRef = useRef<HTMLDivElement>(null)
  const [visibleCards, setVisibleCards] = useState<Set<string>>(new Set())

  // IntersectionObserver: 进入视口时 index % 4 * 50ms 延迟，单批上限 8 张
  useEffect(() => {
    if (isLowEnd || items.length === 0) return
    const cards = listRef.current?.querySelectorAll('.feed-card')
    if (!cards || cards.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        let batchCount = 0
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting && batchCount < 8) {
            const id = entry.target.getAttribute('data-feed-id')
            if (id) {
              const delay = (idx % 4) * 50
              setTimeout(() => {
                setVisibleCards(prev => new Set([...prev, id]))
              }, delay)
              batchCount++
            }
          }
        })
      },
      { threshold: 0.1 }
    )

    cards.forEach(card => observer.observe(card))
    return () => observer.disconnect()
  }, [items, isLowEnd])

  const pageSize = 20

  // 初次加载
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([
      getActivityFeed(1, pageSize),
      getUserStats(user.id),
    ])
      .then(([feedData, stats]) => {
        setItems(feedData.list || [])
        setHasMore(feedData.hasMore || false)
        setPage(1)
        setFollowingCount(stats.followingCount)
        setFollowersCount(stats.followersCount)
      })
      .catch((err: any) => {
        if (err?.message?.includes('401') || err?.message?.includes('未登录')) {
          setError('login_required')
        } else {
          setError(err?.message || '加载失败')
        }
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, user?.id])

  // 加载更多
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    getActivityFeed(nextPage, pageSize)
      .then(data => {
        setItems(prev => [...prev, ...(data.list || [])])
        setHasMore(data.hasMore || false)
        setPage(nextPage)
      })
      .catch((err: any) => {
        console.error('加载更多失败', err)
      })
      .finally(() => setLoadingMore(false))
  }, [loadingMore, hasMore, page, pageSize])

  // ── 渲染 ──

  // 未登录
  if (!isAuthenticated) {
    return (
      <div className="feed-page">
        <div className="feed-page__header">
          <h1 className="feed-page__title">好友动态</h1>
        </div>
        <div className="feed-page__empty">
          <div className="feed-page__empty-icon">🔒</div>
          <p className="feed-page__empty-title">登录后查看好友动态</p>
          <p className="feed-page__empty-desc">登录即可看到你关注的人的最新动态</p>
          <button className="feed-page__login-btn" onClick={() => navigate('/login')}>
            去登录
          </button>
        </div>
      </div>
    )
  }

  // 加载中
  if (loading) {
    return (
      <div className="feed-page">
        <div className="feed-page__header">
          <h1 className="feed-page__title">好友动态</h1>
        </div>
        <FeedSkeleton />
      </div>
    )
  }

  // 错误
  if (error) {
    const isNetworkError = error.includes('Network') || error.includes('网络') || !navigator.onLine
    return (
      <div className="feed-page">
        <div className="feed-page__header">
          <h1 className="feed-page__title">好友动态</h1>
        </div>
        <GlobalEmptyState
          variant={isNetworkError ? 'network-error' : 'load-fail'}
          onAction={feedRetryCount < MAX_FEED_RETRIES ? () => {
            setFeedRetryCount(prev => prev + 1)
            setError(null)
            setLoading(true)
            // Re-trigger fetch via page reload
            window.location.reload()
          } : undefined}
        />
      </div>
    )
  }

  // 无关注
  if (followingCount === 0) {
    return (
      <div className="feed-page">
        <div className="feed-page__header">
          <h1 className="feed-page__title">好友动态</h1>
          {followingCount !== null && (
            <div className="feed-page__stats">
              <span className="feed-page__stat">
                <strong>{followingCount}</strong> 关注
              </span>
              <span className="feed-page__stat">
                <strong>{followersCount ?? '-'}</strong> 粉丝
              </span>
            </div>
          )}
        </div>
        <div className="feed-page__empty">
          <div className="feed-page__empty-icon">👥</div>
          <p className="feed-page__empty-title">还没有关注任何人</p>
          <p className="feed-page__empty-desc">关注其他用户后，这里会展示他们的最新动态</p>
          <button className="feed-page__login-btn" onClick={() => navigate('/rankings')}>
            去发现美食家
          </button>
        </div>
      </div>
    )
  }

  // 已关注但无动态
  if (items.length === 0 && !hasMore) {
    return (
      <div className="feed-page">
        <div className="feed-page__header">
          <h1 className="feed-page__title">好友动态</h1>
          {followingCount !== null && (
            <div className="feed-page__stats">
              <span className="feed-page__stat">
                <strong>{followingCount}</strong> 关注
              </span>
              <span className="feed-page__stat">
                <strong>{followersCount ?? '-'}</strong> 粉丝
              </span>
            </div>
          )}
        </div>
        <div className="feed-page__empty">
          <div className="feed-page__empty-icon">🕊️</div>
          <p className="feed-page__empty-title">暂无动态</p>
          <p className="feed-page__empty-desc">你关注的人还没有发布新内容</p>
        </div>
      </div>
    )
  }

  return (
    <div className="feed-page">
      <div className="feed-page__header">
        <h1 className="feed-page__title">好友动态</h1>
        {followingCount !== null && (
          <div className="feed-page__stats">
            <span className="feed-page__stat">
              <strong>{followingCount}</strong> 关注
            </span>
            <span className="feed-page__stat">
              <strong>{followersCount ?? '-'}</strong> 粉丝
            </span>
          </div>
        )}
      </div>

      {/* 动态列表 */}
      <div className="feed-page__list" ref={listRef}>
        {items.map(item => (
          <FeedCard key={item.id} item={item} isVisible={visibleCards.has(String(item.id))} />
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="feed-page__load-more">
          <button
            className="feed-page__load-more-btn"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 底部提示 */}
      {!hasMore && items.length > 0 && (
        <p className="feed-page__end">— 到底了 —</p>
      )}
    </div>
  )
}
