import { useState } from 'react'
import { getIngredientSubstitutions } from '../api'
import './SubstitutionPanel.css'

interface SubstitutionPanelProps {
  recipeId: string
  ingredientNames: string[]
  onClose: () => void
}

const DIET_FILTERS = [
  { key: '', label: '所有' },
  { key: 'vegetarian', label: '🥬 素食' },
  { key: 'vegan', label: '🌱 纯素' },
  { key: 'low-carb', label: '🥩 低碳水' },
  { key: 'low-fat', label: '🥗 低脂' },
]

const ALLERGEN_FILTERS = [
  { key: '', label: '无过敏原' },
  { key: '花生', label: '🥜 花生' },
  { key: '坚果', label: '🌰 坚果' },
  { key: '乳制品', label: '🥛 乳制品' },
  { key: '鸡蛋', label: '🥚 鸡蛋' },
  { key: '海鲜', label: '🦐 海鲜' },
  { key: '麸质', label: '🌾 麸质' },
  { key: '大豆', label: '🫘 大豆' },
]

export default function SubstitutionPanel({ recipeId, ingredientNames, onClose }: SubstitutionPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [substitutions, setSubstitutions] = useState<Record<string, string[]> | null>(null)
  const [uncategorized, setUncategorized] = useState<string[]>([])
  const [selectedDiet, setSelectedDiet] = useState('')
  const [selectedAllergen, setSelectedAllergen] = useState('')

  const loadSubstitutions = (diet: string, allergen: string) => {
    setLoading(true)
    setError('')
    const filters: any = {}
    if (diet) filters.diet = diet
    if (allergen) filters.avoidAllergens = allergen

    getIngredientSubstitutions(recipeId, filters)
      .then((res: any) => {
        setSubstitutions(res.substitutions || null)
        setUncategorized(res.uncategorized || [])
      })
      .catch(() => setError('加载替代方案失败'))
      .finally(() => setLoading(false))
  }

  const handleDietClick = (key: string) => {
    const newDiet = key === selectedDiet ? '' : key
    setSelectedDiet(newDiet)
    loadSubstitutions(newDiet, selectedAllergen)
  }

  const handleAllergenClick = (key: string) => {
    const newAllergen = key === selectedAllergen ? '' : key
    setSelectedAllergen(newAllergen)
    loadSubstitutions(selectedDiet, newAllergen)
  }

  // Auto-load on first mount
  useState(() => { loadSubstitutions('', '') })

  return (
    <div className="substitution-panel">
      <div className="substitution-panel__header">
        <div className="substitution-panel__title">
          🔄 食材替换建议
        </div>
        <button className="substitution-panel__close" onClick={onClose}>×</button>
      </div>

      {/* 饮食过滤器 */}
      <div className="substitution-panel__filters">
        {DIET_FILTERS.map(f => (
          <button
            key={f.key}
            className={`substitution-panel__filter-btn ${selectedDiet === f.key ? 'substitution-panel__filter-btn--active' : ''}`}
            onClick={() => handleDietClick(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 过敏原过滤器 */}
      <div className="substitution-panel__filters">
        {ALLERGEN_FILTERS.map(f => (
          <button
            key={f.key}
            className={`substitution-panel__filter-btn ${selectedAllergen === f.key ? 'substitution-panel__filter-btn--active' : ''}`}
            onClick={() => handleAllergenClick(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 结果 */}
      {loading && <div className="substitution-panel__loading">加载替换建议...</div>}
      {error && <div className="substitution-panel__error">{error}</div>}
      {!loading && !error && substitutions && Object.keys(substitutions).length === 0 && (
        <div className="substitution-panel__empty">当前过滤条件下无替代食材</div>
      )}
      {!loading && !error && substitutions && Object.keys(substitutions).length > 0 && (
        <div className="substitution-panel__list">
          {Object.entries(substitutions).map(([ingredient, alts]) => (
            <div key={ingredient} className="substitution-panel__item">
              <div className="substitution-panel__ingredient">{ingredient}</div>
              <div className="substitution-panel__alternatives">
                {alts.map(alt => (
                  <span key={alt} className="substitution-panel__alt">{alt}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && !substitutions && (
        <div className="substitution-panel__empty">点击过滤器查看替换建议</div>
      )}
    </div>
  )
}