import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyPick, getPersonalizedDailyPick } from '../api'
import { useAuth } from '../context/AuthContext'
import FavoriteButton from './FavoriteButton'
import type { Recipe } from '../api'
import './PersonalizedDailyPick.css'
import './DailyPickCard.css'

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 今日推荐 · 春鲜正好',
  summer: '☀️ 今日推荐 · 夏日清爽',
  autumn: '🍂 今日推荐 · 秋日丰收',
  winter: '❄️ 今日推荐 · 暖冬滋味',
}

const REASON_COLORS: Record<string, string> = {
  '🍜 你喜欢的菜系': 'var(--reason-cuisine)',
  '🥘 你常用的食材': 'var(--reason-ingredient)',
  '👅 符合你的口味': 'var(--reason-flavor)',
  '🔪 你偏好的做法': 'var(--reason-method)',
  '🌿 当季推荐': 'var(--reason-seasonal)',
  '🔥 热门食谱': 'var(--reason-popular)',
  '🎯 换个口味': 'var(--reason-diversity)',
  '🌟 为你推荐': 'var(--reason-default)',
}

// ── Skeleton ──
function PickSkeleton() {
  return (
    <div className="personalized-pick__grid">
      {[1, 2, 3].map(i => (
        <div key={i} className="personalized-pick__skeleton-card">
          <div className="shimmer personalized-pick__skeleton-img" />
          <div className="personalized-pick__skeleton-body">
            <div className="shimmer" style={{ height: 18, width: '70%', marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 14, width: '50%', marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 14, width: '90%', marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 32, width: 100 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Single card for logged-out users (same as old DailyPickCard) ──
function SinglePickCard({ recipe, onShuffle, isShuffling }: {
  recipe: Recipe | null
  onShuffle: () => void
  isShuffling: boolean
}) {
  const navigate = useNavigate()
  if (!recipe) {
    return (
      <div className="daily-pick-card">
        <div className="daily-pick-card__inner" style={{ justifyContent: 'center', minHeight: 160 }}>
          <div className="daily-pick-card__content" style={{ width: '100%', textAlign: 'center' }}>
            <p className="daily-pick-card__desc">暂无可推荐的食谱，去添加一些吧~</p>
          </div>
        </div>
      </div>
    )
  }
  const seasonLabel = SEASON_LABELS[recipe.season as string] || '🌟 今日推荐 · 美味时刻'
  return (
    <div className={`daily-pick-card${isShuffling ? ' daily-pick-card--shuffling' : ''}`}>
      <div className="daily-pick-card__inner" onClick={() => navigate(`/recipe/${recipe.id}`)} style={{ cursor: 'pointer' }}>
        <div className="daily-pick-card__image-wrap">
          <img
            src={recipe.coverImage || ''}
            alt={recipe.title}
            className="daily-pick-card__image"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="daily-pick-card__badge">{seasonLabel}</span>
        </div>
        <div className="daily-pick-card__content">
          <h3 className="daily-pick-card__title">{recipe.title}</h3>
          <p className="daily-pick-card__desc">{recipe.description}</p>
          <div className="daily-pick-card__meta">
            <span>⏱ {recipe.cookTime}分钟</span>
            <span>·</span>
            <span>难度 {recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '困难'}</span>
            <span>·</span>
            <span>{recipe.servings}人份</span>
          </div>
          {recipe.story && (
            <blockquote className="daily-pick-card__story">💬 {(recipe.story as string).slice(0, 80)}...</blockquote>
          )}
          <div className="daily-pick-card__actions">
            <button
              className="daily-pick-card__btn daily-pick-card__btn--primary"
              onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${recipe.id}`) }}
            >
              查看详情 →
            </button>
            <button
              className="daily-pick-card__btn daily-pick-card__btn--ghost"
              onClick={(e) => { e.stopPropagation(); onShuffle() }}
              disabled={isShuffling}
            >
              🔄 {isShuffling ? '换一道中...' : '换一道'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──
export default function PersonalizedDailyPick() {
  const { isAuthenticated } = useAuth()

  // Logged-out state
  const [singleRecipe, setSingleRecipe] = useState<Recipe | null>(null)
  const [singleLoading, setSingleLoading] = useState(true)
  const [isShuffling, setIsShuffling] = useState(false)

  // Logged-in state
  const [picks, setPicks] = useState<Recipe[]>([])
  const [picksLoading, setPicksLoading] = useState(true)

  const fetchSingle = useCallback(async (random = false) => {
    try {
      if (random) setIsShuffling(true); else setSingleLoading(true)
      const res: any = await getDailyPick(random)
      const data = res.data || res
      if (data.code === 0 && data.data) {
        setSingleRecipe(data.data)
      }
    } catch (err) {
      console.error('Daily pick fetch error:', err)
    } finally {
      setSingleLoading(false)
      setIsShuffling(false)
    }
  }, [])

  const fetchPersonalized = useCallback(async () => {
    setPicksLoading(true)
    try {
      const res: any = await getPersonalizedDailyPick()
      const data = res.data || res
      if (data.code === 0 && data.data?.list) {
        setPicks(data.data.list)
      } else {
        // Fallback to single
        setPicks([])
      }
    } catch (err) {
      console.error('Personalized pick fetch error:', err)
      setPicks([])
    } finally {
      setPicksLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPersonalized()
    } else {
      fetchSingle()
    }
  }, [isAuthenticated, fetchSingle, fetchPersonalized])

  // Logged-out: render single card
  if (!isAuthenticated) {
    if (singleLoading) {
      return (
        <div className="daily-pick-skeleton">
          <div className="daily-pick-skeleton__img shimmer" />
          <div className="daily-pick-skeleton__content">
            <div className="shimmer" style={{ height: 24, width: '60%', marginBottom: 12 }} />
            <div className="shimmer" style={{ height: 16, width: '90%', marginBottom: 8 }} />
            <div className="shimmer" style={{ height: 16, width: '70%', marginBottom: 16 }} />
            <div className="shimmer" style={{ height: 36, width: 120 }} />
          </div>
        </div>
      )
    }
    return <SinglePickCard recipe={singleRecipe} onShuffle={() => fetchSingle(true)} isShuffling={isShuffling} />
  }

  // Logged-in: render personalized picks
  if (picksLoading) {
    return <PickSkeleton />
  }

  if (!picks.length) {
    // Fallback to single pick
    if (singleLoading) {
      return <PickSkeleton />
    }
    return <SinglePickCard recipe={singleRecipe} onShuffle={() => fetchSingle(true)} isShuffling={isShuffling} />
  }

  return (
    <div className="personalized-pick">
      <div className="personalized-pick__header">
        <h2 className="personalized-pick__title">🎯 今日为你推荐</h2>
        <button
          className="personalized-pick__shuffle-btn"
          onClick={fetchPersonalized}
          disabled={picksLoading}
        >
          🔄 换一批
        </button>
      </div>
      <div className="personalized-pick__grid">
        {picks.map(recipe => (
          <PersonalizedPickCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}

function PersonalizedPickCard({ recipe }: { recipe: Recipe & { recommendReason?: string } }) {
  const navigate = useNavigate()
  const reason = recipe.recommendReason || '🌟 为你推荐'
  const reasonColor = REASON_COLORS[reason] || 'var(--reason-default)'

  return (
    <div className="personalized-pick__card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <div className="personalized-pick__card-img-wrap">
        <img
          src={recipe.coverImage || ''}
          alt={recipe.title}
          className="personalized-pick__card-img"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <span className="personalized-pick__card-reason" style={{ background: reasonColor }}>
          {reason}
        </span>
      </div>
      <div className="personalized-pick__card-body">
        <h3 className="personalized-pick__card-title">{recipe.title}</h3>
        <p className="personalized-pick__card-desc">{recipe.description}</p>
        <div className="personalized-pick__card-meta">
          <span>⏱ {recipe.cookTime}分钟</span>
          <span>·</span>
          <span>难度 {recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '困难'}</span>
        </div>
        <div className="personalized-pick__card-actions">
          <button
            className="personalized-pick__card-btn personalized-pick__card-btn--primary"
            onClick={(e) => { e.stopPropagation(); navigate(`/recipe/${recipe.id}`) }}
          >
            查看详情 →
          </button>
          <div onClick={e => e.stopPropagation()}>
            <FavoriteButton recipeId={recipe.id} inline />
          </div>
        </div>
      </div>
    </div>
  )
}