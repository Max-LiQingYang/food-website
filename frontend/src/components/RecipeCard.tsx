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

export default function RecipeCard({ recipe, highlightQuery }: RecipeCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`)
  }

  const titleContent = highlightQuery ? highlightText(recipe.title, highlightQuery) : recipe.title
  const difficulty = recipe.difficulty?.toLowerCase() || ''
  const calories = getCalories(recipe)

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
    >
      {/* 封面图 */}
      <div className="recipe-card__cover">
        {recipe.coverImage ? (
          <ImagePlaceholder src={recipe.coverImage} alt={recipe.title} className="recipe-card__cover-img" />
        ) : (
          <div className="recipe-card__cover-placeholder">🍽️</div>
        )}

        {/* 收藏按钮 - 浮在图片右上角 */}
        <div className="recipe-card__fav" onClick={e => e.stopPropagation()}>
          <FavoriteButton recipeId={recipe.id} inline />
        </div>

        {/* 质量标签 */}
        {recipe.qualityLabel && (
          <span className="recipe-card__badge recipe-card__badge--quality">
            {recipe.qualityLabel}
          </span>
        )}

        {/* 烹饪时间标签 */}
        {recipe.cookTime != null && (
          <span className="recipe-card__badge recipe-card__badge--time">
            ⏱ {recipe.cookTime}分钟
          </span>
        )}
      </div>

      {/* 信息区 */}
      <div className="recipe-card__info">
        <h3 className="recipe-card__title">{titleContent}</h3>

        <div className="recipe-card__meta">
          {/* 作者 */}
          {recipe.author && (
            <span className="recipe-card__meta-item recipe-card__author">
              👨‍🍳 {recipe.author}
            </span>
          )}

          {/* 难度 */}
          {difficulty && DIFFICULTY_LABELS[difficulty] && (
            <span className="recipe-card__meta-item recipe-card__difficulty">
              {DIFFICULTY_ICONS[difficulty]} {DIFFICULTY_LABELS[difficulty]}
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
            {"★".repeat(Math.round(recipe.avgRating))}{"☆".repeat(5 - Math.round(recipe.avgRating))} {" "}
            {recipe.avgRating.toFixed(1)}
            {recipe.ratingCount != null && recipe.ratingCount > 0 && (
              <span className="recipe-card__rating-count">({recipe.ratingCount})</span>
            )}
          </span>
        )}

        {/* 分类标签 */}
        {recipe.category && (
          <span className="recipe-card__category">{recipe.category}</span>
        )}

        {/* 季节标签 */}
        {recipe.season && recipe.season !== 'all' && SEASON_LABELS[recipe.season] && (
          <span className="recipe-card__season">{SEASON_LABELS[recipe.season]}</span>
        )}
      </div>
    </div>
  )
}