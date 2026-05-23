import { useState } from 'react'
import './FilterPanel.css'

export interface FilterState {
  difficulty: string
  maxCookTime: number | null
  sortBy: string
}

interface FilterPanelProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

const DEFAULT_FILTERS: FilterState = {
  difficulty: '',
  maxCookTime: null,
  sortBy: '',
}

export default function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleChange = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value })
  }

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTERS })
  }

  const hasFilters =
    filters.difficulty || filters.maxCookTime !== null || filters.sortBy

  // Build active filter chips
  const chips: string[] = []
  if (filters.difficulty) {
    const labels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }
    chips.push(`难度: ${labels[filters.difficulty] || filters.difficulty}`)
  }
  if (filters.maxCookTime !== null) {
    const labels: Record<number, string> = { 15: '≤15分钟', 30: '≤30分钟', 60: '≤60分钟', 61: '>60分钟' }
    chips.push(`时长: ${labels[filters.maxCookTime] || `≤${filters.maxCookTime}分钟`}`)
  }
  if (filters.sortBy) {
    const labels: Record<string, string> = { rating: '评分最高', time: '时间最短', newest: '最新发布' }
    chips.push(`排序: ${labels[filters.sortBy] || filters.sortBy}`)
  }

  return (
    <div className="filter-panel">
      <button
        className={`filter-panel__toggle ${hasFilters ? 'is-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        ⚙️ 筛选
        {hasFilters && <span className="filter-panel__count">{chips.length}</span>}
      </button>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="filter-panel__chips">
          {chips.map((chip, i) => (
            <span key={i} className="filter-panel__chip">
              {chip}
              <button
                className="filter-panel__chip-close"
                onClick={() => {
                  if (chip.startsWith('难度:')) handleChange('difficulty', '')
                  else if (chip.startsWith('时长:')) handleChange('maxCookTime', null)
                  else if (chip.startsWith('排序:')) handleChange('sortBy', '')
                }}
                aria-label="移除筛选"
              >
                ×
              </button>
            </span>
          ))}
          <button className="filter-panel__reset" onClick={handleReset}>
            一键重置
          </button>
        </div>
      )}

      {/* Expandable filter options */}
      {isOpen && (
        <div className="filter-panel__body">
          {/* Difficulty */}
          <div className="filter-panel__group">
            <span className="filter-panel__label">难度</span>
            <div className="filter-panel__options">
              {[
                { value: '', label: '全部' },
                { value: 'easy', label: '简单' },
                { value: 'medium', label: '中等' },
                { value: 'hard', label: '困难' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`filter-panel__option ${filters.difficulty === opt.value ? 'is-selected' : ''}`}
                  onClick={() => handleChange('difficulty', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cook Time */}
          <div className="filter-panel__group">
            <span className="filter-panel__label">烹饪时间</span>
            <div className="filter-panel__options">
              {[
                { value: null, label: '全部' },
                { value: 15, label: '≤15分钟' },
                { value: 30, label: '≤30分钟' },
                { value: 60, label: '≤60分钟' },
                { value: 61, label: '>60分钟' },
              ].map(opt => (
                <button
                  key={String(opt.value)}
                  className={`filter-panel__option ${filters.maxCookTime === opt.value ? 'is-selected' : ''}`}
                  onClick={() => handleChange('maxCookTime', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="filter-panel__group">
            <span className="filter-panel__label">排序</span>
            <div className="filter-panel__options">
              {[
                { value: '', label: '默认' },
                { value: 'rating', label: '评分最高' },
                { value: 'time', label: '时间最短' },
                { value: 'newest', label: '最新发布' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={`filter-panel__option ${filters.sortBy === opt.value ? 'is-selected' : ''}`}
                  onClick={() => handleChange('sortBy', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-panel__actions">
            <button className="filter-panel__done-btn" onClick={() => setIsOpen(false)}>
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}