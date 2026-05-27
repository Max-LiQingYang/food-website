import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSuggestions } from '../api'
import { highlightText } from '../utils/highlightText'
import './SearchAutocomplete.css'

const HOT_SEARCHES = ['鸡蛋、番茄', '鸡肉、土豆', '红烧肉', '番茄炒蛋', '汤', '甜点']
const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 8
const DEBOUNCE_MS = 300

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
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = '搜索食谱...',
  inputClassName = '',
  showHotSearches = true,
  enableNavigate = true,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [apiSuggestions, setApiSuggestions] = useState<Array<{ id: string; title: string }>>([])
  const [isApiLoading, setIsApiLoading] = useState(false)
  const navigate = useNavigate()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Compute local suggestions
  const localSuggestions = useMemo(() => getSuggestions(value, showHotSearches), [value, showHotSearches])

  // Debounced API search for live suggestions
  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      setApiSuggestions([])
      setIsApiLoading(false)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsApiLoading(true)
      try {
        const res: any = await getSuggestions(trimmed)
        const data = res.data || res
        const list = data.list || []
        const items = list.map((r: any) => ({ id: String(r.id), title: r.title })).filter(item => item.title)
        setApiSuggestions(items)
      } catch {
        setApiSuggestions([])
      } finally {
        setIsApiLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [value])

  // Merge suggestions: local first (history+hot), then API for fresh results
  const allItems = useMemo(() => {
    const apiTitles = new Set(apiSuggestions.map(a => a.title))
    const local = localSuggestions.filter(s => !apiTitles.has(s))
    const merged: Array<{ id: string | null; title: string; source: 'local' | 'api' }> = [
      ...local.map(s => ({ id: null, title: s, source: 'local' as const })),
      ...apiSuggestions.map(a => ({ id: a.id, title: a.title, source: 'api' as const })),
    ]
    return merged
  }, [localSuggestions, apiSuggestions])

  // API title set for icon check
  const apiTitlesSet = useMemo(() => new Set(apiSuggestions.map(a => a.title)), [apiSuggestions])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset active index when value or suggestions change
  useEffect(() => {
    setActiveIndex(-1)
  }, [value, allItems.length])

  const handleSubmit = useCallback(
    (query: string) => {
      if (!query.trim()) return
      saveToHistory(query.trim())
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
      setIsOpen(false)
      navigate(`/recipe/${id}`)
    },
    [navigate, onSubmit, enableNavigate]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const history = loadHistory()
    const visibleLength = allItems.length + (value.trim().length >= 2 && apiSuggestions.length === 0 && !isApiLoading ? 1 : 0) + (!value.trim() && history.length > 0 ? 1 : 0)
    if (!isOpen || visibleLength === 0) {
      if (e.key === 'Enter') {
        handleSubmit(value)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < visibleLength - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : visibleLength - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          const selected = allItems[activeIndex]
          if (selected.source === 'api' && selected.id && enableNavigate) {
            handleNavigate(selected.id, selected.title)
          } else {
            onChange(selected.title)
            handleSubmit(selected.title)
          }
        } else if (activeIndex === allItems.length && value.trim().length >= 2) {
          handleSubmit(value)
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

      {isOpen && allItems.length > 0 && (
        <ul className="search-autocomplete__dropdown">
          {allItems.map((item, index) => (
            <li
              key={item.source === 'api' ? `api-${item.id}` : `local-${item.title}`}
              className={`search-autocomplete__item ${index === activeIndex ? 'is-active' : ''}`}
              onMouseDown={e => {
                e.preventDefault()
                if (item.source === 'api' && item.id && enableNavigate) {
                  handleNavigate(item.id, item.title)
                } else {
                  onChange(item.title)
                  handleSubmit(item.title)
                }
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="search-autocomplete__icon">
                {item.source === 'api' && enableNavigate ? '🔗' : '🕐'}
              </span>
              <span className="search-autocomplete__title">
                {highlightText(item.title, value)}
              </span>
              {item.source === 'api' && enableNavigate && (
                <span className="search-autocomplete__goto">详情 ›</span>
              )}
            </li>
          ))}
          {isApiLoading && (
            <li className="search-autocomplete__item search-autocomplete__loading">
              <span className="search-autocomplete__loading-icon" />
              搜索中...
            </li>
          )}
          {value.trim().length >= 2 && apiSuggestions.length === 0 && !isApiLoading && (
            <li className="search-autocomplete__item search-autocomplete__hint"
              onMouseDown={e => { e.preventDefault(); handleSubmit(value) }}>
              按回车搜索「{value}」
            </li>
          )}
          {!value.trim() && loadHistory().length > 0 && (
            <li className="search-autocomplete__item search-autocomplete__clear"
              onMouseDown={e => { e.preventDefault(); clearHistory(); setIsOpen(false); onChange('') }}>
              清除搜索历史
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

/** Get filtered suggestions: history first, then hot searches */
function getSuggestions(input: string, showHotSearches: boolean): string[] {
  const trimmed = input.trim().toLowerCase()
  const history = loadHistory()

  if (!trimmed) {
    const hot = showHotSearches ? HOT_SEARCHES.filter(h => !history.includes(h)) : []
    return [...history, ...hot]
  }

  const combined = [...history, ...(showHotSearches ? HOT_SEARCHES : [])]
  const unique = [...new Set(combined)]
  return unique.filter(s => s.toLowerCase().includes(trimmed))
}