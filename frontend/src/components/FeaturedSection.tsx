/**
 * components/FeaturedSection.tsx
 * 编辑精选 —— 轮播卡片展示精选食谱
 * 从 GET /api/recipes/featured 获取数据
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeaturedRecipes } from '../api'
import type { Recipe } from '../api'
import RecipeCard from './RecipeCard'
import RecipeCardSkeleton from './RecipeCardSkeleton'
import './FeaturedSection.css'

export default function FeaturedSection() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getFeaturedRecipes()
      .then((res: any) => {
        const data = res.data || res
        setRecipes(Array.isArray(data) ? data : data.list || [])
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null // will be rendered by parent's loading state
  if (error || recipes.length === 0) return null

  return (
    <section className="featured-section">
      <div className="featured-header">
        <h2 className="featured-title">
          <span className="featured-icon">🏆</span> 编辑精选
        </h2>
        <button
          className="featured-view-all"
          onClick={() => navigate('/search?sortBy=rating')}
        >
          查看更多 →
        </button>
      </div>
      <div className="featured-grid">
        {recipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  )
}

/** Skeleton for featured section */
export function FeaturedSectionSkeleton() {
  return (
    <section className="featured-section">
      <div className="featured-header">
        <div className="skeleton skeleton-title" />
      </div>
      <div className="featured-grid">
        {Array.from({ length: 3 }).map((_, i) => <RecipeCardSkeleton key={i} />)}
      </div>
    </section>
  )
}