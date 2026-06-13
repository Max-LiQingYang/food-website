import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDailyPick } from '../api'
import type { Recipe } from '../api'
import './DailyPickCard.css'

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 今日推荐 · 春鲜正好',
  summer: '☀️ 今日推荐 · 夏日清爽',
  autumn: '🍂 今日推荐 · 秋日丰收',
  winter: '❄️ 今日推荐 · 暖冬滋味',
}

export default function DailyPickCard() {
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [isShuffling, setIsShuffling] = useState(false)

  const fetchPick = useCallback(async (random = false) => {
    try {
      if (random) setIsShuffling(true); else setLoading(true)
      const res: any = await getDailyPick(random)
      const data = res.data || res
      if (data.code === 0 && data.data) {
        setRecipe(data.data)
      }
    } catch (err) {
      console.error('Daily pick fetch error:', err)
    } finally {
      setLoading(false)
      setIsShuffling(false)
    }
  }, [])

  useEffect(() => { fetchPick() }, [fetchPick])

  const handleRecipeClick = () => {
    if (recipe?.id) navigate(`/recipe/${recipe.id}`)
  }

  if (loading) {
    return (
      <div className="daily-pick-skeleton">
        <div className="daily-pick-skeleton__img shimmer" />
        <div className="daily-pick-skeleton__content">
          <div className="shimmer" style={{height: 24, width: '60%', marginBottom: 12}} />
          <div className="shimmer" style={{height: 16, width: '90%', marginBottom: 8}} />
          <div className="shimmer" style={{height: 16, width: '70%', marginBottom: 16}} />
          <div className="shimmer" style={{height: 36, width: 120}} />
        </div>
      </div>
    )
  }

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
      <div className="daily-pick-card__inner" onClick={handleRecipeClick} style={{ cursor: 'pointer' }}>
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
              onClick={(e) => { e.stopPropagation(); fetchPick(true) }}
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