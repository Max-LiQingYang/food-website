import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMealPlans, createMealPlan, updateMealPlan, deleteMealPlan, generateShoppingListFromMealPlan } from '../api'
import { searchRecipes } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { MealPlanMeal } from '../api'
import './MealPlannerPage.css'

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}
const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
}
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function formatDate(weekStart: string, dayOffset: number): string {
  const d = new Date(weekStart + 'T00:00:00')
  d.setDate(d.getDate() + dayOffset)
  return d.toISOString().slice(0, 10)
}

export default function MealPlannerPage() {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [mealPlan, setMealPlan] = useState<MealPlanMeal[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [targetSlot, setTargetSlot] = useState<{ day: number; mealType: string }>({ day: 0, mealType: 'breakfast' })
  const [dragOver, setDragOver] = useState<{ day: number; mealType: string } | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
  }, [isAuthenticated, navigate])

  // 加载餐单
  const loadMealPlan = useCallback(async (ws: string) => {
    setLoading(true)
    try {
      const plans = await getMealPlans(ws)
      if (plans && plans.length > 0) {
        setPlanId(plans[0].id)
        setMealPlan(plans[0].meals || [])
      } else {
        setPlanId(null)
        setMealPlan([])
      }
    } catch {
      showToast('加载餐单失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadMealPlan(weekStart)
  }, [weekStart, loadMealPlan])

  // 搜索食谱
  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    try {
      const res = await searchRecipes({ q: q.trim(), pageSize: 10 })
      setSearchResults(res.data || [])
    } catch {
      setSearchResults([])
    }
  }, [])

  // 获取某个位置已有的食谱
  const getMeal = (day: number, mealType: string): MealPlanMeal | undefined => {
    return mealPlan.find(m => m.day === day && m.mealType === mealType)
  }

  // 打开搜索面板
  const openSearch = (day: number, mealType: string) => {
    setTargetSlot({ day, mealType })
    setShowSearch(true)
    setSearchQuery('')
    setSearchResults([])
  }

  // 添加食谱到当前目标位置
  const addToSlot = (recipe: any) => {
    setMealPlan(prev => {
      const filtered = prev.filter(m => !(m.day === targetSlot.day && m.mealType === targetSlot.mealType))
      return [...filtered, {
        day: targetSlot.day,
        mealType: targetSlot.mealType as MealPlanMeal['mealType'],
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeImage: recipe.coverImage || '',
      }]
    })
    setShowSearch(false)
    showToast(`已添加「${recipe.title}」到${DAY_LABELS[targetSlot.day]}${MEAL_TYPE_LABELS[targetSlot.mealType]}`, 'success')
  }

  // 从餐位移除
  const removeFromSlot = (e: React.MouseEvent, day: number, mealType: string) => {
    e.stopPropagation()
    setMealPlan(prev => prev.filter(m => !(m.day === day && m.mealType === mealType)))
  }

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, day: number, mealType: string) => {
    const meal = getMeal(day, mealType)
    if (!meal) return
    e.dataTransfer.setData('application/json', JSON.stringify({ ...meal, sourceDay: day, sourceMealType: mealType }))
  }

  const handleDragOver = (e: React.DragEvent, day: number, mealType: string) => {
    e.preventDefault()
    setDragOver({ day, mealType })
  }

  const handleDrop = (e: React.DragEvent, day: number, mealType: string) => {
    e.preventDefault()
    setDragOver(null)
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      setMealPlan(prev => {
        let updated = [...prev]
        if (data.sourceDay !== undefined) {
          updated = updated.filter(m => !(m.day === data.sourceDay && m.mealType === data.sourceMealType))
        }
        updated = updated.filter(m => !(m.day === day && m.mealType === mealType))
        updated.push({
          day,
          mealType: mealType as MealPlanMeal['mealType'],
          recipeId: data.recipeId,
          recipeTitle: data.recipeTitle,
          recipeImage: data.recipeImage || '',
        })
        return updated
      })
    } catch { /* ignore */ }
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  // 保存餐单
  const handleSave = async () => {
    setSaving(true)
    try {
      if (planId) {
        await updateMealPlan(planId, mealPlan)
        showToast('餐单已更新', 'success')
      } else {
        const newPlan = await createMealPlan(weekStart, mealPlan)
        setPlanId(newPlan.id)
        showToast('餐单已创建', 'success')
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  // 生成购物清单
  const handleGenerateShoppingList = async () => {
    if (!planId) {
      showToast('请先保存餐单', 'warning')
      return
    }
    try {
      await generateShoppingListFromMealPlan(planId)
      showToast('购物清单已生成，请查看购物清单页面', 'success')
    } catch {
      showToast('生成购物清单失败', 'error')
    }
  }

  // 清空餐单
  const handleClear = async () => {
    if (planId) {
      try {
        await deleteMealPlan(planId)
      } catch { /* ignore */ }
    }
    setMealPlan([])
    setPlanId(null)
    showToast('餐单已清空', 'info')
  }

  // 翻周
  const prevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }
  const nextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  const isCurrentWeek = getWeekStart(new Date()) === weekStart

  if (!isAuthenticated) return null

  return (
    <div className="meal-planner">
      <div className="meal-planner__header">
        <h1 className="meal-planner__title">📅 每周餐单计划</h1>
        <div className="meal-planner__actions">
          <button className="meal-planner__btn meal-planner__btn--save" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '💾 保存餐单'}
          </button>
          <button className="meal-planner__btn meal-planner__btn--list" onClick={handleGenerateShoppingList} disabled={!planId}>
            🛒 生成购物清单
          </button>
          <button className="meal-planner__btn meal-planner__btn--clear" onClick={handleClear}>
            🗑️ 清空
          </button>
        </div>
      </div>

      <div className="meal-planner__week-nav">
        <button className="meal-planner__week-btn" onClick={prevWeek}>‹ 上周</button>
        <span className="meal-planner__week-label">
          {weekStart} ~ {formatDate(weekStart, 6)}
          {isCurrentWeek && <span className="meal-planner__current-badge">本周</span>}
        </span>
        <button className="meal-planner__week-btn" onClick={nextWeek}>下周 ›</button>
      </div>

      {loading ? (
        <div className="meal-planner__loading">加载中...</div>
      ) : (
        <div className="meal-planner__grid">
          <div className="meal-planner__grid-header">
            <div className="meal-planner__time-col"></div>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="meal-planner__day-header">
                <span className="meal-planner__day-label">{label}</span>
                <span className="meal-planner__day-date">{formatDate(weekStart, i).slice(5)}</span>
              </div>
            ))}
          </div>

          {MEAL_TYPES.map(mealType => (
            <div key={mealType} className="meal-planner__grid-row">
              <div className="meal-planner__time-col">
                <span className="meal-planner__time-icon">{MEAL_TYPE_ICONS[mealType]}</span>
                <span className="meal-planner__time-label">{MEAL_TYPE_LABELS[mealType]}</span>
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const meal = getMeal(day, mealType)
                const isDragOver = dragOver?.day === day && dragOver?.mealType === mealType
                return (
                  <div
                    key={`${day}-${mealType}`}
                    className={`meal-planner__slot ${meal ? 'meal-planner__slot--filled' : ''} ${isDragOver ? 'meal-planner__slot--drag-over' : ''}`}
                    onDragOver={e => handleDragOver(e, day, mealType)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, day, mealType)}
                    onClick={() => openSearch(day, mealType)}
                  >
                    {meal ? (
                      <div
                        className="meal-planner__meal-card"
                        draggable
                        onDragStart={e => handleDragStart(e, day, mealType)}
                      >
                        {meal.recipeImage && (
                          <img src={meal.recipeImage} alt="" className="meal-planner__meal-img" />
                        )}
                        <span className="meal-planner__meal-title">{meal.recipeTitle}</span>
                        <button
                          className="meal-planner__meal-remove"
                          onClick={e => removeFromSlot(e, day, mealType)}
                          aria-label="移除"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="meal-planner__slot-placeholder">+ 添加食谱</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* 搜索弹窗 */}
      {showSearch && (
        <div className="meal-planner__search-overlay" onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery('') }}>
          <div className="meal-planner__search-modal" onClick={e => e.stopPropagation()}>
            <div className="meal-planner__search-header">
              <h3>选择食谱 → {DAY_LABELS[targetSlot.day]} {MEAL_TYPE_LABELS[targetSlot.mealType]}</h3>
              <button className="meal-planner__search-close" onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery('') }}>✕</button>
            </div>
            <input
              className="meal-planner__search-input"
              placeholder="搜索食谱名称..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
            <div className="meal-planner__search-results">
              {searchResults.length === 0 && searchQuery.trim() && (
                <div className="meal-planner__search-empty">未找到相关食谱</div>
              )}
              {searchResults.map((recipe: any) => (
                <div key={recipe.id} className="meal-planner__search-item">
                  {recipe.coverImage && <img src={recipe.coverImage} alt="" className="meal-planner__search-img" />}
                  <div className="meal-planner__search-info">
                    <span className="meal-planner__search-title">{recipe.title}</span>
                    <span className="meal-planner__search-meta">{recipe.category || recipe.cuisine} · {recipe.cookTime || '?'}分钟</span>
                  </div>
                  <button
                    className="meal-planner__search-add-btn"
                    onClick={() => addToSlot(recipe)}
                  >
                    + 添加
                  </button>
                </div>
              ))}
              {!searchQuery.trim() && (
                <div className="meal-planner__search-hint">输入食谱名称开始搜索</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}