import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../api'
import { highlightText } from '../utils/highlightText'
import FavoriteButton from './FavoriteButton'
import ImagePlaceholder from './ImagePlaceholder'
import './RecipeCard.css'

interface RecipeCardProps {
  recipe: Recipe
  /** Optional search query to highlight in the title */
  highlightQuery?: string
  /** Animation delay for staggered entry (ms) */
  animationDelay?: number
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const DIFFICULTY_ICONS: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

const SMART_DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高手',
}

const SMART_DIFFICULTY_ICONS: Record<string, string> = {
  beginner: '🟢',
  intermediate: '🟡',
  advanced: '🔴',
}

const NUTRI_SCORE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#86efac',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
}

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 春季',
  summer: '☀️ 夏季',
  autumn: '🍂 秋季',
  winter: '❄️ 冬季',
  all: '四季皆宜',
}

function getCalories(recipe: Recipe): number | null {
  if (!recipe.nutrition) return null
  if (typeof recipe.nutrition === 'object') {
    return (recipe.nutrition as any).calories || null
  }
  return null
}

export default function RecipeCard({ recipe, highlightQuery, animationDelay }: RecipeCardProps) {
  const navigate = useNavigate()
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleClick = useCallback(() => {
    navigate(`/recipe/${recipe.id}`)
  }, [navigate, recipe.id])

  const titleContent = highlightQuery ? highlightText(recipe.title, highlightQuery) : recipe.title
  const difficulty = recipe.difficulty?.toLowerCase() || ''
  const calories = getCalories(recipe)

  // Quick preview helpers
  const getPreviewInfo = () => {
    const steps = Array.isArray((recipe as any).steps) ? (recipe as any).steps : []
    const ings = Array.isArray((recipe as any).ingredients) ? (recipe as any).ingredients : []
    return {
      stepCount: steps.length,
      ingCount: ings.length,
      desc: recipe.description || '',
    }
  }

  const preview = getPreviewInfo()

  return (
    <div
      className="recipe-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/recipe/${recipe.id}`)
        }
      }}
      style={animationDelay != null ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      {/* 封面图 */}
      <div className="recipe-card__cover">
        {recipe.coverImage ? (
          <>
            <ImagePlaceholder
              src={recipe.coverImage}
              alt={recipe.title}
              className={`recipe-card__cover-img ${imgLoaded ? 'loaded' : ''}`}
              onLoad={() => setImgLoaded(true)}
            />
            {/* 悬浮预览层 */}
            <div className="recipe-card__hover-overlay">
              <div className="recipe-card__hover-content">
                {preview.desc && <p className="recipe-card__hover-desc">{preview.desc}</p>}
                <div className="recipe-card__hover-stats">
                  <span>📋 {preview.ingCount}种食材</span>
                  <span>📝 {preview.stepCount}步</span>
                </div>
                <span className="recipe-card__hover-cta">查看详情 →</span>
              </div>
            </div>
          </>
        ) : (
          <div className="recipe-card__cover-placeholder">🍽️</div>
        )}

        {/* 收藏按钮 - 浮在图片右上角 */}
        <div className="recipe-card__fav" onClick={e => e.stopPropagation()}>
          <FavoriteButton recipeId={recipe.id} inline />
        </div>

        {/* NutriScore 评级徽章 - 浮在图片左上角 */}
        {recipe.nutriScore && (
          <span
            className="recipe-card__badge recipe-card__nutri-badge"
            style={{ backgroundColor: NUTRI_SCORE_COLORS[recipe.nutriScore] || '#aaa' }}
          >
            NutriScore {recipe.nutriScore}
          </span>
        )}

        {/* 质量标签 */}
        {recipe.qualityLabel && (
          <span className="recipe-card__badge recipe-card__badge--quality">
            {recipe.qualityLabel}
          </span>
        )}

        {/* 烹饪时间标签 (移除了，现在在tags行展示) */}
      </div>

      {/* 信息区 */}
      <div className="recipe-card__info">
        <h3 className="recipe-card__title">{titleContent}</h3>

        {/* 紧凑标签行 */}
        <div className="recipe-card__tags">
          {/* 分类标签 */}
          {recipe.category && (
            <span className="recipe-card__tag recipe-card__tag--category">{recipe.category}</span>
          )}

          {/* 难度 */}
          {difficulty && DIFFICULTY_LABELS[difficulty] && (
            <span className="recipe-card__tag recipe-card__tag--difficulty">
              {DIFFICULTY_ICONS[difficulty]} {DIFFICULTY_LABELS[difficulty]}
            </span>
          )}

          {/* 烹饪时间 */}
          {recipe.cookTime != null && (
            <span className="recipe-card__tag recipe-card__tag--time">⏱ {recipe.cookTime}分钟</span>
          )}

          {/* 季节标签 */}
          {recipe.season && recipe.season !== 'all' && SEASON_LABELS[recipe.season] && (
            <span className="recipe-card__tag recipe-card__tag--season">{SEASON_LABELS[recipe.season]}</span>
          )}

          {/* 智能难度 */}
          {recipe.smartDifficulty && !DIFFICULTY_LABELS[difficulty] && (
            <span className="recipe-card__tag recipe-card__tag--smart">
              {SMART_DIFFICULTY_ICONS[recipe.smartDifficulty] || '⚡'} {SMART_DIFFICULTY_LABELS[recipe.smartDifficulty] || recipe.smartDifficulty}
            </span>
          )}
        </div>

        <div className="recipe-card__meta">
          {/* 作者 */}
          {recipe.author && (
            <span className="recipe-card__meta-item recipe-card__author">
              👨‍🍳 {recipe.author}
            </span>
          )}

          {/* 卡路里 */}
          {calories != null && (
            <span className="recipe-card__meta-item recipe-card__calories">
              🔥 {calories} kcal
            </span>
          )}
        </div>

        {/* 评分星星 */}
        {recipe.avgRating != null && recipe.avgRating > 0 && (
          <span className="recipe-card__meta-item recipe-card__rating">
            {'★'.repeat(Math.round(recipe.avgRating))}{'☆'.repeat(5 - Math.round(recipe.avgRating))} {' '}
            {recipe.avgRating.toFixed(1)}
            {recipe.ratingCount != null && recipe.ratingCount > 0 && (
              <span className="recipe-card__rating-count">({recipe.ratingCount})</span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
