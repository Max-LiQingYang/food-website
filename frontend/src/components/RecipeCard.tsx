import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../api'
import { highlightText } from '../utils/highlightText'
import FavoriteButton from './FavoriteButton'
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
          <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
        ) : (
          <div className="recipe-card__cover-placeholder">🍽️</div>
        )}

        {/* 收藏按钮 - 浮在图片右上角 */}
        <div className="recipe-card__fav" onClick={e => e.stopPropagation()}>
          <FavoriteButton recipeId={recipe.id} inline />
        </div>

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

        {/* 分类标签 */}
        {recipe.category && (
          <span className="recipe-card__category">{recipe.category}</span>
        )}
      </div>
    </div>
  )
}