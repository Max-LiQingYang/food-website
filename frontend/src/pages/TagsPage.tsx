import React from 'react'
import { useNavigate } from 'react-router-dom'
import TagCloud from '../components/TagCloud'
import { logTag } from '../api'
import './TagsPage.css'

const categoryGroups = [
  { label: '🥗 菜系', category: 'cuisine' },
  { label: '🌶️ 口味', category: 'flavor' },
  { label: '🍳 烹饪方式', category: 'cooking' },
  { label: '🌿 食材', category: 'ingredient' },
  { label: '🍽️ 餐点类型', category: 'meal' },
  { label: '📊 难度', category: 'difficulty' },
  { label: '🌸 季节', category: 'season' },
]

const TagsPage: React.FC = () => {
  const navigate = useNavigate()
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    // 短暂延迟，确保骨架屏可见
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleTagClick = (tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`)
  }

  if (!loaded) {
    return (
      <div className="tags-page">
        <div className="tags-page-skeleton">
          <div className="skeleton-title-block">
            <div className="skeleton-line w-40 skeleton-line--lg" />
            <div className="skeleton-line w-60" />
          </div>
          <div className="skeleton-section">
            <div className="skeleton-line w-25" />
            <div className="skeleton-tag-cloud">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton-tag" style={{ width: `${50 + Math.random() * 60}px` }} />
              ))}
            </div>
          </div>
          <div className="skeleton-section">
            <div className="skeleton-line w-25" />
            <div className="skeleton-category-grid">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton-category-item" />
              ))}
            </div>
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-section">
              <div className="skeleton-line w-30" />
              <div className="skeleton-tag-cloud">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="skeleton-tag" style={{ width: `${40 + Math.random() * 50}px` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="tags-page">
      <h1 className="tags-page-title">🏷️ 标签探索</h1>
      <p className="tags-page-subtitle">点击标签探索相关食谱，发现更多美味</p>

      {/* 全标签云 */}
      <div className="tags-page-section">
        <h3>🔥 全部热门标签</h3>
        <TagCloud limit={60} showSearch onTagClick={handleTagClick} minCount={1} />
      </div>

      {/* 分类标签 */}
      <div className="tags-page-section">
        <h3>📂 按分类浏览</h3>
        <div className="tag-category-grid">
          {categoryGroups.map(group => (
            <div
              key={group.category}
              className="tag-category-item"
              onClick={() => navigate(`/search?category=${group.category}`)}
            >
              {group.label}
            </div>
          ))}
        </div>
      </div>

      {/* 按分类显示标签 */}
      {categoryGroups.map(group => (
        <div className="tags-page-section" key={`cloud-${group.category}`}>
          <h3>{group.label}</h3>
          <TagCloud
            limit={15}
            category={group.category}
            onTagClick={handleTagClick}
            minCount={1}
          />
        </div>
      ))}
    </div>
  )
}

export default TagsPage