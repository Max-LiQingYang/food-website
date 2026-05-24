import { useState, useEffect, useCallback } from 'react'
import { getNewUserRecommend, getPopularRecipes, getFeaturedRecipes } from '../api'
import RecipeCard from './RecipeCard'
import RecipeCardSkeleton from './RecipeCardSkeleton'
import type { Recipe } from '../api'
import './PersonalizedRecommendations.css'

type TabType = 'featured' | 'popular' | 'newuser'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'featured', label: '编辑精选', icon: '⭐' },
  { key: 'popular', label: '本周热门', icon: '🔥' },
  { key: 'newuser', label: '新手推荐', icon: '🌱' },
]

export default function PersonalizedRecommendations() {
  const [activeTab, setActiveTab] = useState<TabType>('featured')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (tab: TabType) => {
    setLoading(true)
    try {
      let data: any
      switch (tab) {
        case 'featured':
          data = await getFeaturedRecipes()
          setRecipes(Array.isArray(data) ? data : data?.list || [])
          break
        case 'popular':
          data = await getPopularRecipes({ pageSize: 8 })
          setRecipes(data?.list || [])
          break
        case 'newuser':
          data = await getNewUserRecommend()
          setRecipes(data?.list || [])
          break
      }
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  return (
    <section className="personalized-rec">
      <div className="personalized-rec__header">
        <h2 className="personalized-rec__title">
          <span>🎯</span> 为你推荐
        </h2>
        <div className="personalized-rec__tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`personalized-rec__tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="personalized-rec__tab-icon">{tab.icon}</span>
              <span className="personalized-rec__tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="personalized-rec__content">
        {loading ? (
          <div className="personalized-rec__grid">
            {Array.from({ length: 4 }).map((_, i) => <RecipeCardSkeleton key={i} />)}
          </div>
        ) : recipes.length > 0 ? (
          <div className="personalized-rec__grid">
            {recipes.slice(0, 8).map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="personalized-rec__empty">
            <span className="personalized-rec__empty-icon">📭</span>
            <p>暂无推荐食谱</p>
          </div>
        )}
      </div>
    </section>
  )
}