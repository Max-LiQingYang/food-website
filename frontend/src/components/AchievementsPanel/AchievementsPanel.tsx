import { useState, useEffect, useRef } from 'react'
import { getUserAchievementsGrouped } from '../../api'
import AchievementCategoryPills from './AchievementCategoryPills'
import AchievementProgressRing from './AchievementProgressRing'
import AchievementGrid from './AchievementGrid'
import './AchievementsPanel.css'

interface AchievementsPanelProps {
  userId: string | number
  onAchievementClick?: (achievement: any) => void
}

export default function AchievementsPanel({ userId, onAchievementClick }: AchievementsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    getUserAchievementsGrouped(userId).then(res => {
      if (mountedRef.current) {
        setData(res.data || res)
        setLoading(false)
      }
    }).catch(() => {
      if (mountedRef.current) setLoading(false)
    })
    return () => { mountedRef.current = false }
  }, [userId])

  const allAchievements = data
    ? data.categories.flatMap((c: any) => c.achievements)
    : []

  const filtered = activeCategory === 'all'
    ? allAchievements
    : allAchievements.filter((a: any) => a.category === activeCategory)

  // stagger entrance animation
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => setVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <section className="achievements-panel">
        <div className="achievements-panel__skeleton">
          <div className="achievements-panel__skeleton-title" />
          <div className="achievements-panel__skeleton-pills" />
          <div className="achievements-panel__skeleton-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="achievements-panel__skeleton-badge" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (!data) return null

  return (
    <section className="achievements-panel">
      <div className="achievements-panel__header">
        <h2 className="achievements-panel__title">
          🏅 成就 · 已解锁 <span className="achievements-panel__highlight">{data.unlockedCount}</span> / {data.totalCount} 项
        </h2>
        <AchievementProgressRing unlocked={data.unlockedCount} total={data.totalCount} />
      </div>

      <AchievementCategoryPills
        categories={data.categories}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      <AchievementGrid
        achievements={filtered}
        visible={visible}
        onItemClick={onAchievementClick}
      />
    </section>
  )
}
