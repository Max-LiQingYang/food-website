/**
 * pages/NotFoundPage.tsx
 * 自定义 404 页面 —— 友好的错误提示 + 推荐热门食谱
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getRecipes } from '../api'
import type { Recipe } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [popularRecipes, setPopularRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRecipes({ page: 1, pageSize: 4 })
      .then((res: any) => {
        const data = res.data ?? res
        // favouriteCount field may differ; sort client-side
        const list = (data.list || data || []).slice(0, 4)
        setPopularRecipes(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        {/* 趣味 404 插画 */}
        <div className="not-found-illustration">
          <span className="not-found-emoji">🔍</span>
          <span className="not-found-code">404</span>
          <span className="not-found-emoji not-found-emoji--flip">🍳</span>
        </div>

        <h1 className="not-found-title">哎呀，页面不见了</h1>
        <p className="not-found-desc">
          你找的食谱可能被吃掉了，或者输入的地址有误。
          <br />
          别担心，我们帮你找点别的~
        </p>

        <div className="not-found-actions">
          <button className="btn btn--primary" onClick={() => navigate(-1)}>
            ← 返回上一页
          </button>
          <Link to="/" className="btn btn--outline">
            🏠 回到首页
          </Link>
        </div>
      </div>

      {/* 热门食谱推荐 */}
      {loading ? (
        <div className="not-found-recommend">
          <h2 className="not-found-recommend__title">🔥 这些食谱可能感兴趣</h2>
          <div className="not-found-recommend__grid">
            {[1, 2, 3, 4].map(i => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : popularRecipes.length > 0 ? (
        <div className="not-found-recommend">
          <h2 className="not-found-recommend__title">🔥 这些食谱可能感兴趣</h2>
          <div className="not-found-recommend__grid">
            {popularRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}