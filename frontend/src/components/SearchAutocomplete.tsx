import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchRecipes } from '../api'
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

interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  placeholder?: string
  inputClassName?: string
  /** Show hot searches even when input is empty */
  showHotSearches?: boolean
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder = '搜索食谱...',
  inputClassName = '',
  showHotSearches = true,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([])
  const [isApiLoading, setIsApiLoading] = useState(false)
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
        const res: any = await searchRecipes({ q: trimmed, pageSize: 5 })
        const data = res.data || res
        const list = data.list || []
        const titles = list.map((r: any) => r.title).filter(Boolean)
        setApiSuggestions(titles)
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
  const suggestions = useMemo(() => {
    const s = new Set(localSuggestions)
    const merged = [...localSuggestions]
    for (const api of apiSuggestions) {
      if (!s.has(api)) merged.push(api)
    }
    return merged
  }, [localSuggestions, apiSuggestions])

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
  }, [value, suggestions.length])

  const handleSubmit = useCallback(
    (query: string) => {
      if (!query.trim()) return
      saveToHistory(query.trim())
      setIsOpen(false)
      onSubmit(query.trim())
    },
    [onSubmit]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleLength = suggestions.length + (value.trim().length >= 2 && apiSuggestions.length === 0 && !isApiLoading ? 1 : 0) + (!value.trim() && loadHistory().length > 0 ? 1 : 0)
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
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          const selected = suggestions[activeIndex]
          onChange(selected)
          handleSubmit(selected)
        } else if (activeIndex === suggestions.length && value.trim().length >= 2) {
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

      {isOpen && suggestions.length > 0 && (
        <ul className="search-autocomplete__dropdown">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={`search-autocomplete__item ${index === activeIndex ? 'is-active' : ''}`}
              onMouseDown={e => {
                e.preventDefault()
                onChange(suggestion)
                handleSubmit(suggestion)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="search-autocomplete__icon">
                {apiSuggestions.includes(suggestion) ? '🔍' : value && suggestion.toLowerCase().includes(value.toLowerCase()) ? '🔍' : '🕐'}
              </span>
              {highlightText(suggestion, value)}
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