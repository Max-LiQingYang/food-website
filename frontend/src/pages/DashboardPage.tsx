import { useState, useEffect } from 'react'
import { getDashboard, DashboardData } from '../api'
import { useToast } from '../context/ToastContext'
import PageSkeleton from '../components/PageSkeleton'
import OverviewCards from '../components/dashboard/OverviewCards'
import CookingTrendChart from '../components/dashboard/CookingTrendChart'
import NutritionRadarChart from '../components/dashboard/NutritionRadarChart'
import DistributionChart from '../components/dashboard/DistributionChart'
import Suggestions from '../components/dashboard/Suggestions'
import QuickActions from '../components/dashboard/QuickActions'
import AchievementOverview from '../components/dashboard/AchievementOverview'
import './DashboardPage.css'

export default function DashboardPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ nickname?: string; username?: string } | null>(null)

  useEffect(() => {
    // Load user info
    const stored = localStorage.getItem('user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    // Load dashboard data
    getDashboard()
      .then(setData)
      .catch(() => showToast('加载统计数据失败', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  if (loading) return (
    <div className="dashboard-page">
      <PageSkeleton type="profile" />
    </div>
  )

  if (!data) return (
    <div className="dashboard-page">
      <div className="dashboard-empty">
        <span className="dashboard-empty__icon">😵</span>
        <p>无法加载统计数据</p>
        <button className="btn btn--primary" onClick={() => window.location.reload()}>重新加载</button>
      </div>
    </div>
  )

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const dayStr = `周${weekDays[today.getDay()]}`

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__container">
        {/* Header */}
        <div className="dashboard-page__header">
          <div>
            <h1 className="dashboard-page__greeting">👋 你好，{user?.nickname || user?.username || '美食家'}</h1>
            <p className="dashboard-page__subtitle">欢迎回到你的烹饪之旅</p>
          </div>
          <div className="dashboard-page__date">{dateStr} {dayStr}</div>
        </div>

        {/* Overview Cards */}
        <OverviewCards overview={data.overview} />

        {/* Cooking Trend Chart */}
        <CookingTrendChart data={data.cookingTrend} />

        {/* Chart Grid */}
        <div className="chart-grid">
          <NutritionRadarChart data={data.nutritionRadar} />
          <DistributionChart
            data={data.flavorDistribution}
            title="口味偏好"
            icon="🌶️"
            emptyIcon="🌶️"
            emptyText="收藏或烹饪食谱后即可看到口味偏好"
            emptyCta="去发现食谱"
            emptyLink="/"
            showCenterTotal
          />
          <DistributionChart
            data={data.cuisineDistribution}
            title="菜系分布"
            icon="🥢"
            emptyIcon="🥢"
            emptyText="收藏或烹饪食谱后即可看到菜系分布"
            emptyCta="去发现食谱"
            emptyLink="/"
            isCuisine
          />
        </div>

        {/* Suggestions */}
        <Suggestions suggestions={data.suggestions} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Achievement Overview */}
        <AchievementOverview achievements={data.achievements} />

        {/* Author Stats (conditional) */}
        {data.authorStats.totalRecipes > 0 && (
          <div className="dashboard-card author-stats-section">
            <h3 className="dashboard-card__title">📊 作者统计</h3>
            <div className="author-stats__summary">
              <span>📝 {data.authorStats.totalRecipes} 道食谱</span>
              <span>👁️ {data.authorStats.totalViews.toLocaleString()} 次浏览</span>
              <span>❤️ {data.authorStats.totalFavorites.toLocaleString()} 次收藏</span>
              <span>💬 {data.authorStats.totalComments.toLocaleString()} 条评论</span>
              <span>⭐ {data.authorStats.totalPoints.toLocaleString()} 积分</span>
            </div>
            {data.authorStats.topRecipes.length > 0 && (
              <div className="author-stats__top">
                <div className="author-stats__top-label">热门食谱排行</div>
                {data.authorStats.topRecipes.map((r, i) => (
                  <a key={r.id} href={`/recipe/${r.id}`} className="author-stats__row">
                    <span className="author-stats__rank">#{i + 1}</span>
                    <span className="author-stats__title">{r.title}</span>
                    <span className="author-stats__stats">
                      👁️ {r.views} ❤️ {r.favorites} ⭐ {r.points}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
