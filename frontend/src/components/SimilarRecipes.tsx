import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecipes } from '../api'
import type { Recipe } from '../api'
import './SimilarRecipes.css'

interface SimilarRecipesProps {
  recipeId: string
}

export default function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with GET /api/recipes/:id/similar when backend supports it
    // For now, use getRecipes with same category as fallback
    setLoading(true)
    getRecipes({ page: 1, pageSize: 5 })
      .then((res: any) => {
        const data = res.data || res
        const list = (data.list || []).filter((r: Recipe) => r.id !== recipeId).slice(0, 4)
        setRecipes(list)
      })
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false))
  }, [recipeId])

  if (!loading && recipes.length === 0) return null

  return (
    <section className="similar-recipes">
      <h2 className="similar-recipes__title">📋 相似食谱推荐</h2>

      {loading ? (
        <div className="similar-recipes__scroll">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="similar-recipes__card similar-recipes__card--skeleton">
              <div className="skeleton-box similar-recipes__card-img" />
              <div className="similar-recipes__card-info">
                <div className="skeleton-box" style={{ height: 14, width: '80%' }} />
                <div className="skeleton-box" style={{ height: 12, width: '50%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="similar-recipes__scroll">
          {recipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="similar-recipes__card"
            >
              <div className="similar-recipes__card-img">
                {recipe.coverImage ? (
                  <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
                ) : (
                  <div className="similar-recipes__card-placeholder">🍽️</div>
                )}
              </div>
              <div className="similar-recipes__card-info">
                <h4 className="similar-recipes__card-title">{recipe.title}</h4>
                {recipe.category && (
                  <span className="similar-recipes__card-tag">{recipe.category}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}