import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuggestions as apiGetSuggestions, getHotSearches as apiGetHotSearches } from '../api'
import type { SuggestionItem, HotSearchItem } from '../api'
import { highlightText } from '../utils/highlightText'
import './SearchAutocomplete.css'

const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 8
const DEBOUNCE_MS = 300
const HOT_SEARCHES_CACHE_TTL = 5 * 60 * 1000

// 兜底硬编码热门词（API 全失败时使用）
const FALLBACK_HOT_SEARCHES: HotSearchItem[] = [
  { text: '番茄炒蛋', count: 0, source: 'fallback' },
  { text: '红烧肉', count: 0, source: 'fallback' },
  { text: '蛋糕', count: 0, source: 'fallback' },
  { text: '汤', count: 0, source: 'fallback' },
]

// 分类中文映射
const CATEGORY_LABELS: Record<string, string> = {
  chinese: '中式', western: '西式', dessert: '甜点',
  japanese: '日式', korean: '韩式', other: '其他',
  thai: '泰式', 'quick-meal': '快手菜',
}

// 标签可读化映射
const TAG_LABELS: Record<string, string> = {
  'stir-fry': '炒', 'deep-fry': '炸', boil: '煮', steam: '蒸',
  braise: '烧', 'pan-fry': '煎', spicy: '辣', mala: '麻辣',
  sweet: '甜', sour: '酸', savory: '咸', numbing: '麻',
  chicken: '鸡肉', pork: '猪肉', beef: '牛肉', fish: '鱼',
  shrimp: '虾', egg: '鸡蛋', tofu: '豆腐', vegetable: '蔬菜',
  chinese: '中式', japanese: '日式', korean: '韩式', thai: '泰式',
  western: '西式', low: '实惠', medium: '中等', high: '高端',
}

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveToHistory(query: string) {
  const history = loadHistory()
  const deduped = [query, ...history.filter(h => h !== query)]
  localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped.slice(0, MAX_HISTORY)))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

function removeFromHistory(word: string) {
  const history = loadHistory()
  const filtered = history.filter(h => h !== word)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
}

/** 单条删除搜索历史（暴露给外部组件） */
export function removeHistoryItem(word: string) {
  removeFromHistory(word)
}

// 模块级热门搜索缓存
let _hotSearchesCache: { ts: number; list: HotSearchItem[] } | null = null

interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  inputClassName?: string
  /** Show hot searches even when input is empty */
  showHotSearches?: boolean
  /** When true, clicking an API suggestion navigates to recipe detail */
  enableNavigate?: boolean
  /** 是否在 API 建议项左侧显示封面缩略图（默认 true） */
  showThumbnails?: boolean
  /** 是否显示「🏷️ 匹配标签 / 📂 匹配分类」分组（默认 true） */
  showTagGroups?: boolean
  /** 是否调用 /hot-searches API 获取热门词（默认 true） */
  useApiHotSearches?: boolean
  /** 触发 API 建议的最短字符数（默认 1） */
  minQueryLength?: number
  /** 下拉列表最大高度，px（默认 360） */
  dropdownMaxHeight?: number
}

type NavItem =
  | { kind: 'chip-tag';      label: string }
  | { kind: 'chip-category'; label: string }
  | { kind: 'item';          itemIdx: number }
  | { kind: 'mini';          mode: 'history' | 'hot'; text: string }
  | { kind: 'footer' }

export default function SearchAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = '搜索食谱...',
  inputClassName = '',
  showHotSearches = true,
  enableNavigate = true,
  showThumbnails = true,
  showTagGroups = true,
  useApiHotSearches = true,
  minQueryLength = 1,
  dropdownMaxHeight = 360,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [apiSuggestions, setApiSuggestions] = useState<SuggestionItem[]>([])
  const [matchedTags, setMatchedTags] = useState<string[]>([])
  const [matchedCategories, setMatchedCategories] = useState<string[]>([])
  const [isApiLoading, setIsApiLoading] = useState(false)
  const [hotSearches, setHotSearches] = useState<HotSearchItem[]>([])
  const [isHotLoading, setIsHotLoading] = useState(false)
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set())
  const [historyRev, setHistoryRev] = useState(0)

  const navigate = useNavigate()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const history = useMemo(() => loadHistory(), [historyRev, isOpen])

  // ── Debounced API search ──
  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < minQueryLength) {
      setApiSuggestions([])
      setMatchedTags([])
      setMatchedCategories([])
      setIsApiLoading(false)
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    debounceTimerRef.current = setTimeout(async () => {
      setIsApiLoading(true)
      try {
        const res: any = await apiGetSuggestions(trimmed)
        const data = res?.data ?? res
        const list: SuggestionItem[] = (data?.list || []).map((r: any) => ({
          id: String(r.id),
          title: r.title,
          category: r.category ?? null,
          coverImage: r.coverImage ?? null,
          tags: r.tags ?? null,
        })).filter((it: SuggestionItem) => it.title)
        setApiSuggestions(list)
        if (showTagGroups) {
          setMatchedTags(Array.isArray(data?.matchedTags) ? data.matchedTags.slice(0, 4) : [])
          setMatchedCategories(Array.isArray(data?.matchedCategories) ? data.matchedCategories.slice(0, 4) : [])
        } else {
          setMatchedTags([])
          setMatchedCategories([])
        }
      } catch {
        setApiSuggestions([])
        setMatchedTags([])
        setMatchedCategories([])
      } finally {
        setIsApiLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [value, minQueryLength, showTagGroups])

  // ── Load hot searches when input is empty ──
  useEffect(() => {
    if (value.trim() || !showHotSearches) return

    // Use cache when fresh
    if (_hotSearchesCache && Date.now() - _hotSearchesCache.ts < HOT_SEARCHES_CACHE_TTL) {
      setHotSearches(_hotSearchesCache.list)
      return
    }

    if (!useApiHotSearches) {
      setHotSearches(FALLBACK_HOT_SEARCHES)
      return
    }

    let cancelled = false
    setIsHotLoading(true)
    apiGetHotSearches()
      .then((res: any) => {
        if (cancelled) return
        const data = res?.data ?? res
        const list: HotSearchItem[] = (data?.list || []).map((it: any) => ({
          text: String(it.text),
          count: typeof it.count === 'number' ? it.count : 0,
          source: it.source === 'fallback' ? 'fallback' : 'search',
        })).filter((it: HotSearchItem) => it.text)
        const finalList = list.length > 0 ? list : FALLBACK_HOT_SEARCHES
        _hotSearchesCache = { ts: Date.now(), list: finalList }
        setHotSearches(finalList)
      })
      .catch(() => {
        if (cancelled) return
        setHotSearches(FALLBACK_HOT_SEARCHES)
      })
      .finally(() => {
        if (!cancelled) setIsHotLoading(false)
      })

    return () => { cancelled = true }
  }, [value, showHotSearches, useApiHotSearches])

  // ── Merge core items: API suggestions (when value present), else local history ──
  const allItems = useMemo(() => {
    type Merged =
      | { source: 'api'; id: string; title: string; category: string | null; coverImage: string | null }
      | { source: 'local'; id: null; title: string }

    const merged: Merged[] = []
    if (value.trim()) {
      // 输入有值：只显示 API 建议（不再把历史混入主列表，避免重复）
      for (const a of apiSuggestions) {
        merged.push({
          source: 'api',
          id: a.id,
          title: a.title,
          category: a.category ?? null,
          coverImage: a.coverImage ?? null,
        })
      }
    }
    return merged
  }, [value, apiSuggestions])


  // ── Build flat navigable items ──
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = []
    const trimmed = value.trim()

    if (trimmed && showTagGroups && matchedTags.length > 0) {
      matchedTags.forEach(t => items.push({ kind: 'chip-tag', label: t }))
    }
    if (trimmed && showTagGroups && matchedCategories.length > 0) {
      matchedCategories.forEach(c => items.push({ kind: 'chip-category', label: c }))
    }
    allItems.forEach((_, i) => items.push({ kind: 'item', itemIdx: i }))
    if (!trimmed && history.length > 0) {
      history.forEach(h => items.push({ kind: 'mini', mode: 'history', text: h }))
    }
    if (!trimmed && showHotSearches && hotSearches.length > 0) {
      hotSearches.forEach(h => items.push({ kind: 'mini', mode: 'hot', text: h.text }))
    }
    if (!trimmed && history.length > 0) {
      items.push({ kind: 'footer' })
    }
    return items
  }, [value, showTagGroups, matchedTags, matchedCategories, allItems, history, hotSearches, showHotSearches])

  // ── Close on outside click ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Reset active index when nav items change ──
  useEffect(() => {
    setActiveIndex(-1)
  }, [value, navItems.length])

  const handleSubmit = useCallback(
    (query: string) => {
      if (!query.trim()) return
      saveToHistory(query.trim())
      setHistoryRev(r => r + 1)
      setIsOpen(false)
      onSubmit(query.trim())
    },
    [onSubmit]
  )

  const handleNavigate = useCallback(
    (id: string, title: string) => {
      if (!id || !enableNavigate) {
        handleSubmit(title)
        return
      }
      saveToHistory(title.trim())
      setHistoryRev(r => r + 1)
      setIsOpen(false)
      navigate(`/recipe/${id}`)
    },
    [navigate, enableNavigate, handleSubmit]
  )

  const handleChipClick = useCallback(
    (text: string) => {
      onChange(text)
      handleSubmit(text)
    },
    [onChange, handleSubmit]
  )

  const handleThumbError = useCallback((id: string) => {
    setThumbErrors(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const activateNavItem = useCallback(
    (nav: NavItem) => {
      switch (nav.kind) {
        case 'chip-tag':
        case 'chip-category':
          handleChipClick(nav.label)
          break
        case 'item': {
          const it = allItems[nav.itemIdx]
          if (!it) return
          if (it.source === 'api' && it.id && enableNavigate) {
            handleNavigate(it.id, it.title)
          } else {
            onChange(it.title)
            handleSubmit(it.title)
          }
          break
        }
        case 'mini':
          onChange(nav.text)
          handleSubmit(nav.text)
          break
        case 'footer':
          clearHistory()
          setHistoryRev(r => r + 1)
          setIsOpen(false)
          onChange('')
          break
      }
    },
    [allItems, enableNavigate, handleChipClick, handleNavigate, handleSubmit, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || navItems.length === 0) {
      if (e.key === 'Enter') handleSubmit(value)
      else if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < navItems.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : navItems.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < navItems.length) {
          activateNavItem(navItems[activeIndex])
        } else {
          handleSubmit(value)
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const trimmed = value.trim()
  const showMatchedTags = !!trimmed && showTagGroups && matchedTags.length > 0
  const showMatchedCategories = !!trimmed && showTagGroups && matchedCategories.length > 0
  const showHistory = !trimmed && history.length > 0
  const showHotBlock = !trimmed && showHotSearches
  const hasAnyContent =
    showMatchedTags ||
    showMatchedCategories ||
    allItems.length > 0 ||
    isApiLoading ||
    (trimmed.length >= minQueryLength && !isApiLoading && apiSuggestions.length === 0) ||
    showHistory ||
    showHotBlock

  // Helper to check if a nav item is the active one
  const isNavActive = (kind: NavItem['kind'], match: Partial<NavItem>): boolean => {
    if (activeIndex < 0 || activeIndex >= navItems.length) return false
    const cur = navItems[activeIndex] as any
    if (cur.kind !== kind) return false
    for (const key of Object.keys(match)) {
      if (cur[key] !== (match as any)[key]) return false
    }
    return true
  }

  return (
    <div className="search-autocomplete" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className={inputClassName || 'search-autocomplete__input'}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          if (!isOpen) setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {isOpen && hasAnyContent && (
        <div
          className="search-autocomplete__dropdown"
          style={{ maxHeight: `${dropdownMaxHeight}px` }}
        >
          {showMatchedTags && (
            <div className="search-autocomplete__group">
              <div className="search-autocomplete__group-title">🏷️ 匹配标签</div>
              <div className="search-autocomplete__chips">
                {matchedTags.map(tag => (
                  <button
                    key={`tag-${tag}`}
                    type="button"
                    className={`search-autocomplete__chip ${isNavActive('chip-tag', { label: tag }) ? 'is-active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); handleChipClick(tag) }}
                  >
                    {TAG_LABELS[tag] || tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showMatchedCategories && (
            <div className="search-autocomplete__group">
              <div className="search-autocomplete__group-title">📂 匹配分类</div>
              <div className="search-autocomplete__chips">
                {matchedCategories.map(cat => (
                  <button
                    key={`cat-${cat}`}
                    type="button"
                    className={`search-autocomplete__chip search-autocomplete__chip--category ${isNavActive('chip-category', { label: cat }) ? 'is-active' : ''}`}
                    onMouseDown={e => { e.preventDefault(); handleChipClick(cat) }}
                  >
                    {CATEGORY_LABELS[cat] || cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(showMatchedTags || showMatchedCategories) && allItems.length > 0 && (
            <div className="search-autocomplete__divider" />
          )}

          {(allItems.length > 0 || isApiLoading || (trimmed.length >= minQueryLength && !isApiLoading && apiSuggestions.length === 0 && trimmed)) && (
            <ul className="search-autocomplete__list">
              {allItems.map((item, idx) => {
                const isApi = item.source === 'api'
                const apiId = isApi ? (item as any).id : null
                const hasCover = isApi && showThumbnails && (item as any).coverImage && !thumbErrors.has(apiId)
                const showThumb = isApi && showThumbnails
                const isActive = isNavActive('item', { itemIdx: idx })

                return (
                  <li
                    key={isApi ? `api-${apiId}` : `local-${item.title}`}
                    className={`search-autocomplete__item ${isActive ? 'is-active' : ''}`}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (isApi && apiId && enableNavigate) {
                        handleNavigate(apiId, item.title)
                      } else {
                        onChange(item.title)
                        handleSubmit(item.title)
                      }
                    }}
                    onMouseEnter={() => {
                      const navIdx = navItems.findIndex(n => n.kind === 'item' && (n as any).itemIdx === idx)
                      if (navIdx >= 0) setActiveIndex(navIdx)
                    }}
                  >
                    {showThumb ? (
                      hasCover ? (
                        <span className="search-autocomplete__thumb">
                          <img
                            src={(item as any).coverImage}
                            alt=""
                            loading="lazy"
                            onError={() => apiId && handleThumbError(apiId)}
                          />
                        </span>
                      ) : (
                        <span className="search-autocomplete__thumb search-autocomplete__thumb--fallback">🍽️</span>
                      )
                    ) : (
                      <span className="search-autocomplete__icon">{isApi ? '🔗' : '🕐'}</span>
                    )}

                    <div className="search-autocomplete__body">
                      <div className="search-autocomplete__title">
                        {highlightText(item.title, value)}
                      </div>
                      {isApi && (item as any).category && (
                        <div className="search-autocomplete__desc">
                          {CATEGORY_LABELS[(item as any).category] || (item as any).category}
                        </div>
                      )}
                    </div>

                    {isApi && enableNavigate && (
                      <span className="search-autocomplete__goto">详情 ›</span>
                    )}
                  </li>
                )
              })}

              {isApiLoading && (
                <li className="search-autocomplete__item search-autocomplete__loading">
                  <span className="search-autocomplete__loading-icon" />
                  搜索中...
                </li>
              )}

              {!isApiLoading && trimmed.length >= minQueryLength && apiSuggestions.length === 0 && (
                <li
                  className="search-autocomplete__item search-autocomplete__hint"
                  onMouseDown={e => { e.preventDefault(); handleSubmit(value) }}
                >
                  按回车搜索「{value}」
                </li>
              )}
            </ul>
          )}

          {showHistory && (
            <>
              {(allItems.length > 0 || showMatchedTags || showMatchedCategories) && <div className="search-autocomplete__divider" />}
              <div className="search-autocomplete__section">
                <div className="search-autocomplete__section-title">🕐 搜索历史</div>
                <ul className="search-autocomplete__mini-list">
                  {history.map((word, i) => {
                    const isActive = isNavActive('mini', { mode: 'history', text: word })
                    return (
                      <li
                        key={`hist-${word}-${i}`}
                        className={`search-autocomplete__mini-item ${isActive ? 'is-active' : ''}`}
                        onMouseDown={e => {
                          e.preventDefault()
                          onChange(word)
                          handleSubmit(word)
                        }}
                      >
                        <span className="search-autocomplete__mini-icon">🕐</span>
                        <span>{word}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}

          {showHotBlock && (
            <>
              {(showHistory || allItems.length > 0) && <div className="search-autocomplete__divider" />}
              <div className="search-autocomplete__section">
                <div className="search-autocomplete__section-title">🔥 热门搜索</div>
                {isHotLoading && hotSearches.length === 0 ? (
                  <div className="search-autocomplete__skeleton">
                    <div className="search-autocomplete__skeleton-row" />
                    <div className="search-autocomplete__skeleton-row" />
                    <div className="search-autocomplete__skeleton-row" />
                  </div>
                ) : (
                  <ul className="search-autocomplete__mini-list">
                    {hotSearches.map((it, i) => {
                      const isActive = isNavActive('mini', { mode: 'hot', text: it.text })
                      return (
                        <li
                          key={`hot-${it.text}-${i}`}
                          className={`search-autocomplete__mini-item ${isActive ? 'is-active' : ''}`}
                          onMouseDown={e => {
                            e.preventDefault()
                            onChange(it.text)
                            handleSubmit(it.text)
                          }}
                        >
                          <span className="search-autocomplete__mini-icon">🔥</span>
                          <span>{it.text}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </>
          )}

          {showHistory && (
            <div className="search-autocomplete__footer">
              <button
                type="button"
                className={`search-autocomplete__clear ${isNavActive('footer', {}) ? 'is-active' : ''}`}
                onMouseDown={e => {
                  e.preventDefault()
                  clearHistory()
                  setHistoryRev(r => r + 1)
                  setIsOpen(false)
                  onChange('')
                }}
              >
                清除搜索历史
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
