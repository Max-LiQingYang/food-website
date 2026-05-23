import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPreferences, updatePreferences, type UserPreferences } from '../api'
import { useToast } from '../context/ToastContext'
import './PreferencesPage.css'

const DIET_OPTIONS = [
  { value: '', label: '无限制' },
  { value: 'vegetarian', label: '🥬 素食' },
  { value: 'vegan', label: '🌱 纯素' },
  { value: 'low-carb', label: '🥩 低碳水' },
  { value: 'low-calorie', label: '🔥 低卡路里' },
  { value: 'gluten-free', label: '🌾 无麸质' },
]

const CUISINE_OPTIONS = [
  { value: '', label: '无限制' },
  { value: 'chinese', label: '🥟 中餐' },
  { value: 'western', label: '🥩 西餐' },
  { value: 'japanese', label: '🍣 日料' },
  { value: 'korean', label: '🥘 韩餐' },
  { value: 'thai', label: '🍜 泰国菜' },
  { value: 'indian', label: '🍛 印度菜' },
  { value: 'vietnamese', label: '🍜 越南菜' },
  { value: 'dessert', label: '🍰 甜品' },
]

const DIFFICULTY_OPTIONS = [
  { value: '', label: '无限制' },
  { value: 'easy', label: '😊 简单' },
  { value: 'medium', label: '🤔 中等' },
  { value: 'hard', label: '😤 困难' },
]

const TIME_OPTIONS = [
  { value: '', label: '无限制' },
  { value: '15', label: '⏱ 15 分钟内' },
  { value: '30', label: '⏱ 30 分钟内' },
  { value: '60', label: '⏱ 1 小时内' },
  { value: '120', label: '⏱ 2 小时内' },
]

const ALLERGY_OPTIONS = ['花生', '坚果', '乳制品', '鸡蛋', '海鲜', '大豆', '麸质', '芝麻']

export default function PreferencesPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [prefs, setPrefs] = useState<UserPreferences>({
    diet: '', cuisine: '', difficulty: '', maxCookTime: '',
    allergies: [], excludedIngredients: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [excludedInput, setExcludedInput] = useState('')

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await getPreferences()
      setPrefs(data)
    } catch {
      // Defaults
    } finally {
      setLoading(false)
    }
  }

  const toggleAllergy = (allergen: string) => {
    setPrefs(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergen)
        ? prev.allergies.filter(a => a !== allergen)
        : [...prev.allergies, allergen]
    }))
  }

  const addExcluded = () => {
    const val = excludedInput.trim()
    if (!val) return
    if (prefs.excludedIngredients.includes(val)) {
      toast.info('已在排除列表中')
      return
    }
    setPrefs(prev => ({
      ...prev,
      excludedIngredients: [...prev.excludedIngredients, val]
    }))
    setExcludedInput('')
  }

  const removeExcluded = (ingredient: string) => {
    setPrefs(prev => ({
      ...prev,
      excludedIngredients: prev.excludedIngredients.filter(i => i !== ingredient)
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePreferences(prefs)
      toast.success('偏好设置已保存')
    } catch (err: any) {
      toast.error(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="pref-page">
        <div className="pref-skeleton">
          <div className="skeleton-box" style={{ height: 28, width: '40%' }} />
          <div className="skeleton-box" style={{ height: 50, width: '100%', marginTop: 20 }} />
          <div className="skeleton-box" style={{ height: 50, width: '100%', marginTop: 12 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="pref-page">
      <h1 className="pref-title">⚙️ 饮食偏好设置</h1>
      <p className="pref-subtitle">设置你的饮食偏好，我们将为你推荐更合适的食谱</p>

      {/* Diet */}
      <section className="pref-section">
        <h2 className="pref-section-title">饮食习惯</h2>
        <div className="pref-options">
          {DIET_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pref-option-btn ${prefs.diet === opt.value ? 'is-active' : ''}`}
              onClick={() => setPrefs(prev => ({ ...prev, diet: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cuisine */}
      <section className="pref-section">
        <h2 className="pref-section-title">偏好菜系</h2>
        <div className="pref-options">
          {CUISINE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pref-option-btn ${prefs.cuisine === opt.value ? 'is-active' : ''}`}
              onClick={() => setPrefs(prev => ({ ...prev, cuisine: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Difficulty */}
      <section className="pref-section">
        <h2 className="pref-section-title">烹饪难度</h2>
        <div className="pref-options">
          {DIFFICULTY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pref-option-btn ${prefs.difficulty === opt.value ? 'is-active' : ''}`}
              onClick={() => setPrefs(prev => ({ ...prev, difficulty: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Max cook time */}
      <section className="pref-section">
        <h2 className="pref-section-title">最大烹饪时间</h2>
        <div className="pref-options">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`pref-option-btn ${prefs.maxCookTime === opt.value ? 'is-active' : ''}`}
              onClick={() => setPrefs(prev => ({ ...prev, maxCookTime: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Allergies */}
      <section className="pref-section">
        <h2 className="pref-section-title">🚫 过敏原</h2>
        <p className="pref-hint">选择需要避免的过敏原</p>
        <div className="pref-toggles">
          {ALLERGY_OPTIONS.map(allergen => (
            <label key={allergen} className="pref-toggle">
              <input
                type="checkbox"
                checked={prefs.allergies.includes(allergen)}
                onChange={() => toggleAllergy(allergen)}
              />
              <span>{allergen}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Excluded Ingredients */}
      <section className="pref-section">
        <h2 className="pref-section-title">🚫 排除食材</h2>
        <p className="pref-hint">输入你不喜欢的食材（按回车添加）</p>
        <div className="pref-input-row">
          <input
            type="text"
            className="pref-input"
            placeholder="例如：香菜、芹菜..."
            value={excludedInput}
            onChange={e => setExcludedInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExcluded()}
          />
          <button className="btn btn--primary btn--sm" onClick={addExcluded}>添加</button>
        </div>
        {prefs.excludedIngredients.length > 0 && (
          <div className="pref-tags">
            {prefs.excludedIngredients.map((ing, i) => (
              <span key={i} className="pref-tag">
                {ing}
                <button className="pref-tag-remove" onClick={() => removeExcluded(ing)}>×</button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Save */}
      <div className="pref-actions">
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ 保存中...' : '💾 保存偏好设置'}
        </button>
        <button className="btn btn--ghost" onClick={() => navigate('/preferences/recommendations')}>
          🍽️ 查看推荐食谱
        </button>
      </div>
    </div>
  )
}