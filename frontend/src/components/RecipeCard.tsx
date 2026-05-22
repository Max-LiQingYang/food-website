import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../api'
import './RecipeCard.css'

interface RecipeCardProps {
  recipe: Recipe
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const navigate = useNavigate()

  return (
    <div className="recipe-card" onClick={() => navigate(`/recipe/${recipe.id}`)}>
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
        <h3 className="recipe-card__title">{recipe.title}</h3>
        <p className="recipe-card__author">👨‍🍳 {recipe.author || '未知作者'}</p>
        {recipe.category && <span className="recipe-card__category">{recipe.category}</span>}
      </div>
    </div>
  )
}
