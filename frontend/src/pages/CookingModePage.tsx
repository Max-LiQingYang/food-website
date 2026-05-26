import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecipeById, createCookingLog } from '../api'
import type { RecipeDetail } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import StepTimer from '../components/StepTimer'
import './CookingModePage.css'

export default function CookingModePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { speak, stop: stopSpeech, speaking, supported: speechSupported } = useSpeechSynthesis()

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Step navigation state
  const [currentIdx, setCurrentIdx] = useState(0)
  // Ingredient panel
  const [showIngredientPanel, setShowIngredientPanel] = useState(false)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set())
  // Serving scale
  const scaleKey = id ? `serving_scale_${id}` : ''
  const [servingScale, setServingScale] = useState<number>(() => {
    if (!scaleKey) return 1
    try {
      const saved = localStorage.getItem(scaleKey)
      return saved ? JSON.parse(saved) : 1
    } catch { return 1 }
  })
  // Completed steps (localStorage)
  const storageKey = id ? `cook_completed_${id}` : ''
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    if (!storageKey) return new Set()
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })
  // TTS toggle (default off)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  // Audio beep for timer completion
  const audioCtxRef = useRef<AudioContext | null>(null)
  // Track if user has reached last step
  const [cookingComplete, setCookingComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch recipe
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getRecipeById(id)
      .then(r => { setRecipe(r); setLoading(false) })
      .catch(e => { setError(e.message || '加载食谱失败'); setLoading(false) })
  }, [id])

  // Find first incomplete step on load
  useEffect(() => {
    if (!recipe?.steps?.length) return
    const firstIncomplete = recipe.steps.findIndex(s => !completedSteps.has(s.stepNumber))
    setCurrentIdx(firstIncomplete >= 0 ? firstIncomplete : 0)
  }, [recipe?.steps?.length]) // only on load, not on completedSteps change

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') { setShowIngredientPanel(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // TTS: speak current step when enabled and step changes
  const ttsRef = useRef(false)
  useEffect(() => { ttsRef.current = ttsEnabled }, [ttsEnabled])
  useEffect(() => {
    if (ttsEnabled && recipe?.steps?.[currentIdx]) {
      const text = recipe.steps[currentIdx].content
      speak(text, () => {
        if (ttsRef.current && currentIdx < (recipe?.steps?.length || 1) - 1) {
          // Auto-advance on speech end is optional; better to let user control
        }
      })
    }
  }, [currentIdx, ttsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop TTS on unmount
  useEffect(() => {
    return () => stopSpeech()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist serving scale
  useEffect(() => {
    if (scaleKey) localStorage.setItem(scaleKey, JSON.stringify(servingScale))
  }, [servingScale, scaleKey])

  // Persist completed steps
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify([...completedSteps]))
  }, [completedSteps, storageKey])

  const steps = recipe?.steps || []
  const ingredients = recipe?.ingredients || []
  const stepCount = steps.length
  const currentStep = steps[currentIdx]
  const isFirst = currentIdx === 0
  const isLast = currentIdx === stepCount - 1

  // Scaled ingredients
  const scaledIngredients = ingredients.map(ing => ({
    ...ing,
    displayAmount: ing.amount * servingScale,
  }))

  const goPrev = useCallback(() => {
    stopSpeech()
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
  }, [currentIdx, stopSpeech])

  const goNext = useCallback(() => {
    stopSpeech()
    if (currentIdx < stepCount - 1) {
      setCurrentIdx(i => i + 1)
    }
  }, [currentIdx, stepCount, stopSpeech])

  const toggleCompleted = useCallback((stepNum: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepNum)) next.delete(stepNum)
      else next.add(stepNum)
      return next
    })
  }, [])

  const toggleIngredientCheck = useCallback((idx: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const handleFinish = useCallback(async () => {
    if (!id || !user) {
      toast.showToast('请先登录后再记录烹饪', 'warning')
      return
    }
    setSubmitting(true)
    try {
      await createCookingLog({
        recipeId: id,
        cookedAt: new Date().toISOString(),
        rating: 5,
        notes: '已完成烹饪模式',
      })
      toast.showToast('🎉 恭喜完成烹饪！美味出炉！', 'success')
      navigate(`/recipe/${id}`)
    } catch (e: any) {
      toast.showToast('记录失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [id, user, navigate, toast])

  // Touch swipe handlers
  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(diff) < 50) return
    if (diff > 0) goPrev()
    else goNext()
  }

  if (loading) {
    return (
      <div className="cook-page" role="main" aria-label="加载中">
        <div className="cook-page__loading">
          <div className="cook-page__spinner" />
          <p>加载食谱中...</p>
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="cook-page" role="main" aria-label="加载失败">
        <div className="cook-page__error">
          <p>{error || '食谱未找到'}</p>
          <button className="cook-page__btn cook-page__btn--primary" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cook-page" role="main" aria-label={`烹饪模式: ${recipe.title}`}>
      {/* ── Top Bar ── */}
      <header className="cook-page__topbar">
        <button
          className="cook-page__topbar-btn"
          onClick={() => navigate(`/recipe/${id}`)}
          aria-label="退出烹饪模式"
        >
          ✕
        </button>
        <h1 className="cook-page__title">{recipe.title}</h1>
        <div className="cook-page__topbar-right">
          {/* TTS toggle */}
          {speechSupported && (
            <button
              className={`cook-page__topbar-btn ${ttsEnabled ? 'is-active' : ''}`}
              onClick={() => setTtsEnabled(v => !v)}
              aria-label={ttsEnabled ? '关闭语音朗读' : '开启语音朗读'}
              title={ttsEnabled ? '关闭朗读' : '开启朗读'}
            >
              {ttsEnabled ? '🔊' : '🔇'}
            </button>
          )}
          {/* Ingredient panel toggle */}
          <button
            className={`cook-page__topbar-btn ${showIngredientPanel ? 'is-active' : ''}`}
            onClick={() => setShowIngredientPanel(v => !v)}
            aria-label="查看食材清单"
            title="食材清单"
          >
            🥬
          </button>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className="cook-page__progress" role="progressbar" aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={stepCount} aria-label={`步骤 ${currentIdx + 1}/${stepCount}`}>
        <div className="cook-page__progress-fill" style={{ width: `${((currentIdx + 1) / stepCount) * 100}%` }} />
        <span className="cook-page__progress-text">{currentIdx + 1} / {stepCount}</span>
      </div>

      {/* ── Step Content ── */}
      <div
        className="cook-page__body"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Step thumbnail nav */}
        <div className="cook-page__thumbnails">
          {steps.map((s, i) => (
            <button
              key={s.stepNumber}
              className={`cook-page__thumb ${i === currentIdx ? 'is-current' : ''} ${completedSteps.has(s.stepNumber) ? 'is-done' : ''}`}
              onClick={() => { stopSpeech(); setCurrentIdx(i) }}
              aria-label={`跳转到步骤 ${s.stepNumber}`}
            >
              {s.stepNumber}
            </button>
          ))}
        </div>

        {/* Main step display */}
        <div className="cook-page__step-card" key={currentIdx}>
          {/* Step number badge */}
          <div className={`cook-page__step-badge ${completedSteps.has(currentStep?.stepNumber) ? 'is-done' : ''}`}>
            <span className="cook-page__step-badge-num">{currentStep?.stepNumber}</span>
            {completedSteps.has(currentStep?.stepNumber) && <span className="cook-page__step-badge-check">✓</span>}
          </div>

          {/* Step content */}
          <p className="cook-page__step-content">{currentStep?.content}</p>

          {/* Step image */}
          {currentStep?.image && (
            <img
              src={currentStep.image}
              alt={`步骤 ${currentStep.stepNumber}`}
              className="cook-page__step-image"
              loading="lazy"
            />
          )}

          {/* StepTimer — extracted from step content */}
          <div className="cook-page__timer-row">
            <StepTimer stepNumber={currentStep?.stepNumber || 0} stepContent={currentStep?.content || ''} />
          </div>

          {/* Mark completed */}
          <button
            className={`cook-page__complete-btn ${completedSteps.has(currentStep?.stepNumber) ? 'is-done' : ''}`}
            onClick={() => toggleCompleted(currentStep?.stepNumber)}
          >
            {completedSteps.has(currentStep?.stepNumber) ? '✓ 已完成' : '○ 标记完成'}
          </button>

          {/* Finish cooking CTA on last step */}
          {isLast && (
            <div className="cook-page__finish-area">
              <div className="cook-page__finish-divider">🎊 最后一步 🎊</div>
              <button
                className="cook-page__btn cook-page__btn--finish"
                onClick={handleFinish}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '🏁 完成烹饪'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation arrows ── */}
      <div className="cook-page__nav-arrows">
        <button
          className={`cook-page__nav-arrow ${isFirst ? 'is-hidden' : ''}`}
          onClick={goPrev}
          disabled={isFirst}
          aria-label="上一步"
        >
          ‹
        </button>
        <div className="cook-page__nav-dots">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`cook-page__dot ${i === currentIdx ? 'is-active' : ''} ${i < currentIdx || completedSteps.has(steps[i]?.stepNumber) ? 'is-done' : ''}`}
            />
          ))}
        </div>
        <button
          className={`cook-page__nav-arrow ${isLast ? 'is-hidden' : ''}`}
          onClick={goNext}
          disabled={isLast}
          aria-label="下一步"
        >
          ›
        </button>
      </div>

      {/* ── Swipe hint ── */}
      <p className="cook-page__swipe-hint">← 滑动切换步骤 →</p>

      {/* ── Ingredient Drawer ── */}
      {showIngredientPanel && (
        <>
          <div className="cook-page__drawer-backdrop" onClick={() => setShowIngredientPanel(false)} aria-label="关闭食材面板" />
          <aside className="cook-page__drawer" role="dialog" aria-label="食材清单">
            <div className="cook-page__drawer-header">
              <h2>🥬 食材清单</h2>
              <button className="cook-page__topbar-btn" onClick={() => setShowIngredientPanel(false)} aria-label="关闭">
                ✕
              </button>
            </div>

            {/* Serving scaler */}
            {recipe.servings && (
              <div className="cook-page__scaler">
                <span>份量:</span>
                <button className="cook-page__scaler-btn" onClick={() => setServingScale(s => Math.max(0.5, +(s - 0.5).toFixed(1)))} disabled={servingScale <= 0.5}>−</button>
                <span className="cook-page__scaler-value">{servingScale}x</span>
                <button className="cook-page__scaler-btn" onClick={() => setServingScale(s => +(s + 0.5).toFixed(1))}>+</button>
                <span className="cook-page__scaler-original">({recipe.servings} 人份)</span>
              </div>
            )}

            <ul className="cook-page__ingredients">
              {scaledIngredients.map((ing, idx) => (
                <li
                  key={idx}
                  className={`cook-page__ingredient ${checkedIngredients.has(idx) ? 'is-checked' : ''}`}
                  onClick={() => toggleIngredientCheck(idx)}
                  role="checkbox"
                  aria-checked={checkedIngredients.has(idx)}
                >
                  <span className="cook-page__ingredient-check">
                    {checkedIngredients.has(idx) ? '✓' : '○'}
                  </span>
                  <span className="cook-page__ingredient-name">{ing.name}</span>
                  <span className="cook-page__ingredient-amount">
                    {ing.displayAmount} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>

            {/* Progress */}
            <p className="cook-page__ingredient-progress">
              已准备 {checkedIngredients.size}/{scaledIngredients.length} 项
            </p>
          </aside>
        </>
      )}
    </div>
  )
}