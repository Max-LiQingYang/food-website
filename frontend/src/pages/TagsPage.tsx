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

  const handleTagClick = (tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`)
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