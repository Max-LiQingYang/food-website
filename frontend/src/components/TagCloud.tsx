import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getPopularTags, searchTags, logTag, TagItem } from '../api'
import './TagCloud.css'

interface TagCloudProps {
  limit?: number
  category?: string
  showSearch?: boolean
  onTagClick?: (tag: string) => void
  minCount?: number
}

const categoryColors: Record<string, string> = {
  cuisine: 'tag-cuisine',
  flavor: 'tag-flavor',
  meal: 'tag-meal',
  difficulty: 'tag-difficulty',
  ingredient: 'tag-ingredient',
  season: 'tag-season',
  cooking: 'tag-cooking',
}

function getSizeClass(count: number, maxCount: number): string {
  const ratio = maxCount > 0 ? count / maxCount : 0
  if (ratio >= 0.9) return 'tag-size-huge'
  if (ratio >= 0.7) return 'tag-size-xxl'
  if (ratio >= 0.5) return 'tag-size-xl'
  if (ratio >= 0.35) return 'tag-size-lg'
  if (ratio >= 0.2) return 'tag-size-md'
  if (ratio >= 0.1) return 'tag-size-sm'
  return 'tag-size-xs'
}

const TagCloud: React.FC<TagCloudProps> = ({
  limit = 30,
  category,
  showSearch = false,
  onTagClick,
  minCount = 1,
}) => {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TagItem[] | null>(null)

  const loadTags = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPopularTags({ limit, category, minCount })
      setTags(result.list || [])
    } catch {
      setTags([])
    }
    setLoading(false)
  }, [limit, category, minCount])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const result = await searchTags(searchQuery.trim())
        setSearchResults(result.list || [])
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLogTag = async (tag: string, tagCategory?: string) => {
    try {
      await logTag(tag, tagCategory)
    } catch { /* silent */ }
  }

  const displayTags = searchResults !== null ? searchResults : tags
  const maxCount = displayTags.length > 0 ? Math.max(...displayTags.map(t => t.count)) : 1

  if (loading) {
    return (
      <div className="tag-cloud-container">
        <div className="tag-cloud-wrapper">
          <div className="tag-cloud-loading">加载标签中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="tag-cloud-container">
      {(showSearch || tags.length > 0) && (
        <div className="tag-cloud-header">
          <h2>🏷️ 热门标签</h2>
          {showSearch && (
            <input
              type="text"
              className="tag-search-input"
              placeholder="搜索标签"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          )}
        </div>
      )}
      <div className="tag-cloud-wrapper">
        {displayTags.length === 0 ? (
          <div className="tag-cloud-empty">
            {searchQuery ? '没有匹配的标签' : '暂无标签'}
          </div>
        ) : (
          displayTags.map(item => {
            const colorClass = categoryColors[item.category || ''] || 'tag-default'
            const sizeClass = getSizeClass(item.count, maxCount)
            return (
              <span
                key={item.tag}
                className={`tag-cloud-item ${colorClass} ${sizeClass}`}
                onClick={() => {
                  handleLogTag(item.tag, item.category)
                  onTagClick?.(item.tag)
                }}
              >
                <span className="tag-name">{item.tag}</span>
                <span className="tag-count">({item.count})</span>
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}

export default TagCloud