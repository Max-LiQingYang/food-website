import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPopularTags, type TagItem } from '../api'
import './HomeTagsSection.css'

const SEASONAL_TAGS = [
  { label: '🔥 快手菜', tag: '快手菜', icon: '⏱️' },
  { label: '🥗 减脂餐', tag: '减脂餐', icon: '🥗' },
  { label: '🧁 烘焙', tag: '烘焙', icon: '🧁' },
  { label: '🍲 炖菜', tag: '炖菜', icon: '🍲' },
  { label: '🥟 饺子', tag: '饺子', icon: '🥟' },
  { label: '🍜 面条', tag: '面条', icon: '🍜' },
  { label: '🥩 红烧', tag: '红烧', icon: '🥩' },
  { label: '🍚 炒饭', tag: '炒饭', icon: '🍚' },
]

const HomeTagsSection: React.FC = () => {
  const [popularTags, setPopularTags] = useState<TagItem[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    getPopularTags({ limit: 12 }).then((res) => {
      setPopularTags(res.list || [])
    }).catch(() => {})
  }, [])

  // 给 popularTags 数据回退到 SEASONAL_TAGS 时分配 icon（基于 tag 名匹配，否则用 '🏷️'）
  const iconMap: Record<string, string> = SEASONAL_TAGS.reduce(
    (acc, t) => ({ ...acc, [t.tag]: t.icon }),
    {}
  )

  const tagCloud = useMemo(() => {
    if (popularTags.length > 0) {
      return popularTags.slice(0, 8).map(item => ({
        label: `${item.tag} (${item.count})`,
        tag: item.tag,
        icon: iconMap[item.tag] || '🏷️',
        count: item.count,
      }))
    }
    return SEASONAL_TAGS
  }, [popularTags])

  return (
    <section className="home-tags-section">
      <h2 className="home-section__title">
        <span className="home-section__icon">🏷️</span>
        热门标签
      </h2>
      <div className="home-tags-grid">
        {tagCloud.map((item, idx) => (
          <div
            key={item.tag}
            className="home-tags-card"
            style={{ animationDelay: `${idx * 0.05}s` }}
            onClick={() => navigate(`/search?tag=${encodeURIComponent(item.tag)}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/search?tag=${encodeURIComponent(item.tag)}`) }}
          >
            {item.icon && <span className="home-tags-card__icon" aria-hidden="true">{item.icon}</span>}
            <span className="home-tags-card__label">{item.label}</span>
            {popularTags.length > 0 && item.count != null && (
              <span
                className="home-tags-card__badge"
                style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                aria-label={`${item.count} 个食谱`}
              >
                {item.count}
              </span>
            )}
          </div>
        ))}
      </div>
      <Link to="/tags" className="home-tags-more">
        查看全部标签 →
      </Link>
    </section>
  )
}

export default HomeTagsSection