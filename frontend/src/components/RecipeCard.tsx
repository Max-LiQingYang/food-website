import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../api'
import { highlightText } from '../utils/highlightText'
import './RecipeCard.css'

interface RecipeCardProps {
  recipe: Recipe
  /** Optional search query to highlight in the title */
  highlightQuery?: string
}

export default function RecipeCard({ recipe, highlightQuery }: RecipeCardProps) {
  const navigate = useNavigate()
  const [pressed, setPressed] = useState(false)

  const handleTouchStart = useCallback(() => setPressed(true), [])
  const handleTouchEnd = useCallback(() => {
    setPressed(false)
    navigate(`/recipe/${recipe.id}`)
  }, [navigate, recipe.id])

  const handleClick = () => {
    navigate(`/recipe/${recipe.id}`)
  }

  const titleContent = highlightQuery
    ? highlightText(recipe.title, highlightQuery)
    : recipe.title

  return (
    <div
      className={`recipe-card ${pressed ? 'recipe-card--pressed' : ''}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setPressed(false)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/recipe/${recipe.id}`)
        }
      }}
    >
      <div className="recipe-card__cover">
        {recipe.coverImage ? (
          <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
        ) : (
          <div className="recipe-card__cover-placeholder">🍽️</div>
        )}
        {recipe.cookTime != null && (
          <span className="recipe-card__cooktime">⏱ {recipe.cookTime} 分钟</span>
        )}
      </div>
      <div className="recipe-card__info">
        <h3 className="recipe-card__title">{titleContent}</h3>
        <p className="recipe-card__author">👨‍🍳 {recipe.author || '未知作者'}</p>
        {recipe.category && <span className="recipe-card__category">{recipe.category}</span>}
      </div>
      <div className="recipe-card__actions" onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
        <AddToCollectionDropdown recipeId={recipe.id} />
        <AddToShoppingListButton recipeId={recipe.id} />
      </div>
    </div>
  )
}