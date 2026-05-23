import { useState, useEffect, useRef, useCallback } from 'react'
import './SearchAutocomplete.css'

const HOT_SEARCHES = ['鸡蛋、番茄', '鸡肉、土豆', '红烧肉', '番茄炒蛋', '汤', '甜点']
const HISTORY_KEY = 'search_history'
const MAX_HISTORY = 8

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
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Compute suggestions
  const suggestions = getSuggestions(value, showHotSearches)

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
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit(value)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          const selected = suggestions[activeIndex]
          onChange(selected)
          handleSubmit(selected)
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
                {value && suggestion.toLowerCase().includes(value.toLowerCase()) ? '🔍' : '🕐'}
              </span>
              {suggestion}
            </li>
          ))}
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
    // Empty input: show history first, then hot searches
    const hot = showHotSearches ? HOT_SEARCHES.filter(h => !history.includes(h)) : []
    return [...history, ...hot]
  }

  // Filtering mode: match against combined set
  const combined = [
    ...history,
    ...(showHotSearches ? HOT_SEARCHES : []),
  ]
  const unique = [...new Set(combined)]
  return unique.filter(s => s.toLowerCase().includes(trimmed))
}