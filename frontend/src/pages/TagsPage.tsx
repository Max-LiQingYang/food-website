import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TagCloud from '../components/TagCloud'
import { logTag } from '../api'
import './TagsPage.css'
import PageSkeleton from '../components/PageSkeleton'
import { getMotionSafeScrollBehavior } from '../context/MotionPreferenceContext'

/* ── Category config ── */
interface CategoryConfig {
  key: string
  label: string
  icon: string
  gradient: [string, string]
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'cuisine',     label: '菜系',     icon: '🥗', gradient: ['#FF6B6B', '#EE5A5A'] },
  { key: 'flavor',      label: '口味',     icon: '🌶️', gradient: ['#FFA94D', '#F59F00'] },
  { key: 'cooking',     label: '烹饪方式', icon: '🍳', gradient: ['#69DB7C', '#40C057'] },
  { key: 'ingredient',  label: '食材',     icon: '🌿', gradient: ['#74C0FC', '#339AF0'] },
  { key: 'meal',        label: '餐点类型', icon: '🍽️', gradient: ['#B197FC', '#845EF7'] },
  { key: 'difficulty',  label: '难度',     icon: '📊', gradient: ['#FF8787', '#FA5252'] },
  { key: 'season',      label: '季节',     icon: '🌸', gradient: ['#63E6BE', '#20C997'] },
]

/* ── Data types ── */
interface TagsStats {
  totalTags: number
  totalRecipes: number
  categories: CategoryStat[]
}

interface CategoryStat {
  category: string
  count: number
  topTags: string[]
}

interface RelatedTag {
  tag: string
  count: number
}

/* ── Component ── */
const TagsPage: React.FC = () => {
  const navigate = useNavigate()

  /* ── state ── */
  const [loaded, setLoaded] = useState(false)
  const [stats, setStats] = useState<TagsStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [categoryTags, setCategoryTags] = useState<Record<string, string[]>>({})
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [relatedTags, setRelatedTags] = useState<RelatedTag[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  /* ── load stats ── */
  useEffect(() => {
    let cancelled = false
    async function load() {
      setStatsLoading(true)
      try {
        const res = await fetch('/api/tags/stats')
        const data = await res.json()
        if (!cancelled) {
          const raw = data.data || data
          const cats = raw.categories || []
          setStats({
            totalTags: cats.reduce((s: number, c: any) => s + (parseInt(c.tagCount, 10) || 0), 0),
            totalRecipes: cats.reduce((s: number, c: any) => s + (parseInt(c.countSum, 10) || 0), 0),
            categories: cats,
          })
        }
      } catch {
        // silent
      }
      if (!cancelled) setStatsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  /* ── skeleton timer ── */
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  /* ── load related tags ── */
  useEffect(() => {
    if (!selectedTag) {
      setRelatedTags([])
      return
    }
    let cancelled = false
    async function load() {
      setRelatedLoading(true)
      try {
        const res = await fetch(`/api/tags/related?tag=${encodeURIComponent(selectedTag!)}`)
        const data = await res.json()
        if (!cancelled) {
          setRelatedTags(data.data?.related || data.list || [])
        }
      } catch {
        // silent
      }
      if (!cancelled) setRelatedLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [selectedTag])

  /* ── load category tags when expanded ── */
  useEffect(() => {
    if (!expandedCategory) return
    if (categoryTags[expandedCategory]) return // already loaded
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/tags/popular?category=${expandedCategory}&limit=30&minCount=1`)
        const data = await res.json()
        if (!cancelled) {
          const list = (data.data?.list || data.list || []).map((t: any) => t.tag || t)
          setCategoryTags(prev => ({ ...prev, [expandedCategory!]: list }))
        }
      } catch {
        // silent
      }
    }
    load()
    return () => { cancelled = true }
  }, [expandedCategory])

  /* ── handlers ── */
  const handleTagClick = useCallback((tag: string) => {
    logTag(tag)
    setSelectedTag(tag)
    // scroll to related section after state updates
    setTimeout(() => {
      document.getElementById('related-tags-section')?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' })
    }, 100)
  }, [])

  const handleRelatedTagClick = useCallback((tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`)
  }, [navigate])

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategory(prev => (prev === key ? null : key))
  }, [])

  const navigateToSearch = useCallback((tag: string) => {
    navigate(`/search?tag=${encodeURIComponent(tag)}`)
  }, [navigate])

  /* ── derived ── */
  const filteredCategories = searchQuery.trim()
    ? CATEGORIES.filter(c => c.label.includes(searchQuery.trim()) || c.key.includes(searchQuery.trim()))
    : CATEGORIES

  /* ── skeleton ── */
  if (!loaded || statsLoading) {
    return (
      <div className="tags-page">
        <div className="tags-skeleton">
          {/* Hero skeleton */}
          <div className="tags-skeleton__hero">
            <div className="skeleton-block skeleton-block--title" />
            <div className="skeleton-block skeleton-block--subtitle" />
            <div className="tags-skeleton__stats-row">
              <div className="skeleton-block skeleton-block--stat" />
              <div className="skeleton-block skeleton-block--stat" />
            </div>
            <div className="skeleton-block skeleton-block--search" />
          </div>

          {/* Cloud skeleton */}
          <div className="tags-skeleton__section">
            <div className="skeleton-block skeleton-block--heading" />
            <div className="tags-skeleton__tags-row">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton-tag-pill" style={{ width: `${40 + Math.random() * 80}px` }} />
              ))}
            </div>
          </div>

          {/* Category cards skeleton */}
          <div className="tags-skeleton__section">
            <div className="skeleton-block skeleton-block--heading" />
            <div className="tags-skeleton__card-grid">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton-category-card">
                  <div className="skeleton-block skeleton-block--card-header" />
                  <div className="tags-skeleton__chips">
                    <div className="skeleton-tag-pill" style={{ width: '60px' }} />
                    <div className="skeleton-tag-pill" style={{ width: '48px' }} />
                    <div className="skeleton-tag-pill" style={{ width: '72px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tags-page">
      {/* ═══ Hero ═══ */}
      <section className="tags-hero">
        <div className="tags-hero__content">
          <h1 className="tags-hero__title">🏷️ 标签探索</h1>
          <p className="tags-hero__subtitle">发现食谱标签，轻松找到你的最爱</p>

          {stats && (
            <div className="tags-hero__stats">
              <div className="tags-hero__stat">
                <span className="tags-hero__stat-num">{stats.totalTags}</span>
                <span className="tags-hero__stat-label">标签总数</span>
              </div>
              <div className="tags-hero__stat-divider" />
              <div className="tags-hero__stat">
                <span className="tags-hero__stat-num">{stats.totalRecipes}</span>
                <span className="tags-hero__stat-label">食谱总数</span>
              </div>
            </div>
          )}

          <div className="tags-hero__search-wrap">
            <span className="tags-hero__search-icon">🔍</span>
            <input
              className="tags-hero__search"
              type="text"
              placeholder="搜索标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ═══ Hot Tag Cloud ═══ */}
      <section className="tags-cloud-section">
        <h2 className="tags-section-title">
          <span className="tags-section-title__icon">🔥</span>
          热门标签云
          <span className="tags-section-title__line" />
        </h2>
        <TagCloud
          limit={60}
          showSearch
          onTagClick={handleTagClick}
          minCount={1}
        />
      </section>

      {/* ═══ Category Cards ═══ */}
      <section className="tags-category-section">
        <h2 className="tags-section-title">
          <span className="tags-section-title__icon">📂</span>
          按分类浏览
          <span className="tags-section-title__line" />
        </h2>

        {filteredCategories.length === 0 ? (
          <div className="tags-category-empty">没有匹配的分类</div>
        ) : (
          <div className="category-card-grid">
            {filteredCategories.map(cat => {
              const isExpanded = expandedCategory === cat.key
              const catStat = stats?.categories?.find((c: CategoryStat) => c.category === cat.key)
              const tags = categoryTags[cat.key] || []

              return (
                <div
                  key={cat.key}
                  className={`category-card ${isExpanded ? 'category-card--expanded' : ''}`}
                  style={{
                    '--card-grad-from': cat.gradient[0],
                    '--card-grad-to': cat.gradient[1],
                  } as React.CSSProperties}
                >
                  {/* Header — clickable */}
                  <button
                    className="category-card__header"
                    onClick={() => toggleCategory(cat.key)}
                    aria-expanded={isExpanded}
                  >
                    <span className="category-card__icon">{cat.icon}</span>
                    <div className="category-card__info">
                      <span className="category-card__name">{cat.label}</span>
                      <span className="category-card__count">
                        {catStat ? `${catStat.tagCount} 个标签` : '—'}
                      </span>
                    </div>
                    <span className={`category-card__arrow ${isExpanded ? 'category-card__arrow--up' : ''}`}>
                      ▼
                    </span>
                  </button>

                  {/* Top 3 preview */}
                  {catStat && catStat.topTags && catStat.topTags.length > 0 && (
                    <div className="category-card__top-tags">
                      {catStat.topTags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="category-card__chip"
                          onClick={e => {
                            e.stopPropagation()
                            navigateToSearch(tag)
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded tag grid */}
                  <div className={`category-card__tags ${isExpanded ? 'category-card__tags--open' : ''}`}>
                    <div className="category-card__tags-inner">
                      {tags.length === 0 && isExpanded && (
                        <span className="category-card__tags-loading">加载中...</span>
                      )}
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="category-card__tag-item"
                          onClick={() => navigateToSearch(tag)}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ═══ Related Tags ═══ */}
      {selectedTag && (
        <section id="related-tags-section" className="related-tags-section">
          <h2 className="tags-section-title">
            <span className="tags-section-title__icon">🔗</span>
            与「{selectedTag}」相关的标签
            <span className="tags-section-title__line" />
          </h2>

          {relatedLoading ? (
            <div className="related-tags-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-tag-pill" style={{ width: `${60 + Math.random() * 60}px` }} />
              ))}
            </div>
          ) : relatedTags.length === 0 ? (
            <p className="related-tags-empty">暂无相关标签</p>
          ) : (
            <div className="related-tags-list">
              {relatedTags.map(rt => (
                <button
                  key={rt.tag}
                  className="related-tag-chip"
                  onClick={() => handleRelatedTagClick(rt.tag)}
                >
                  {rt.tag}
                  <span className="related-tag-chip__count">{rt.count}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export default TagsPage
