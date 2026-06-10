import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createRecipe, updateRecipe, getRecipeById, forkRecipe } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import ImportFromUrl from '../components/ImportFromUrl'
import type { CreateRecipeData, ImportedRecipe } from '../api'
import './CreateRecipePage.css'
import PageSkeleton from '../components/PageSkeleton'

const CATEGORIES = [
  { value: 'chinese', label: '中餐' },
  { value: 'western', label: '西餐' },
  { value: 'japanese', label: '日料' },
  { value: 'korean', label: '韩餐' },
  { value: 'dessert', label: '甜品' },
  { value: 'other', label: '其他' },
]

const DIFFICULTIES = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]

const CATEGORY_LABELS: Record<string, string> = {
  chinese: '中餐', western: '西餐', japanese: '日料',
  korean: '韩餐', dessert: '甜品', other: '其他',
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单', medium: '中等', hard: '困难',
}

const EMPTY_INGREDIENT = { name: '', amount: 0, unit: 'g' }
const EMPTY_STEP = { stepNumber: 1, content: '' }

export default function CreateRecipePage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [servings, setServings] = useState(2)
  const [difficulty, setDifficulty] = useState('easy')
  const [cookTime, setCookTime] = useState(30)
  const [tips, setTips] = useState('')
  const [story, setStory] = useState('')
  const [culturalBackground, setCulturalBackground] = useState('')
  const [ingredients, setIngredients] = useState<Array<{ name: string; amount: number; unit: string }>>([{ ...EMPTY_INGREDIENT }])
  const [steps, setSteps] = useState<Array<{ stepNumber: number; content: string; image?: string }>>([{ ...EMPTY_STEP }])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  // ═══ #63: 食谱改编模式 ──
  const [searchParams] = useSearchParams()
  const forkFrom = searchParams.get('forkFrom')
  const [forkFromTitle, setForkFromTitle] = useState('')
  const [changesNote, setChangesNote] = useState('')
  const [forkLoading, setForkLoading] = useState(!!forkFrom)

  // 改编模式：加载原食谱数据预填充表单
  useEffect(() => {
    if (!forkFrom) return
    setForkLoading(true)
    getRecipeById(forkFrom)
      .then(res => {
        const data = (res as any).data ?? res
        setTitle(data.title.replace(/（改编）$/, '') + '（改进版）')
        setDescription(data.description || '')
        setCategory(data.category || '')
        setCoverImage(data.coverImage || '')
        setServings(data.servings || 2)
        setDifficulty(data.difficulty || 'easy')
        setCookTime(data.cookTime || 30)
        if (data.ingredients) {
          setIngredients(Array.isArray(data.ingredients) ? data.ingredients : [{ ...EMPTY_INGREDIENT }])
        }
        if (data.steps) {
          setSteps(Array.isArray(data.steps) ? data.steps : [{ ...EMPTY_STEP }])
        }
        setTips(data.tips || '')
        setForkFromTitle(data.title)
      })
      .catch(() => {
        toast.error('加载原食谱数据失败')
      })
      .finally(() => setForkLoading(false))
  }, [forkFrom])

  // Drag state
  const [dragIngIndex, setDragIngIndex] = useState<number | null>(null)
  const [dragStepIndex, setDragStepIndex] = useState<number | null>(null)
  const [dragOverIngIndex, setDragOverIngIndex] = useState<number | null>(null)
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null)

  // Rich text toolbar refs
  const stepTextareaRefs = useRef<(HTMLTextAreaElement | null)[]>([])

  // ── Wizard step state ──
  const STEPS = [
    { key: 'basic', label: '基本信息', icon: '📝' },
    { key: 'ingredients', label: '食材清单', icon: '🥘' },
    { key: 'steps', label: '制作步骤', icon: '🍳' },
    { key: 'advanced', label: '更多设置', icon: '⚙️' },
  ]
  const [currentStep, setCurrentStep] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  // ── Validation state ──
  interface ValidationErrors {
    title?: string
    ingredients?: string
    steps?: string
  }
  const [errors, setErrors] = useState<ValidationErrors>({})

  // ── Auto-save draft ──
  const DRAFT_KEY = isEdit ? `recipe_draft_edit_${id}` : 'recipe_draft_new'

  // Load draft
  useEffect(() => {
    if (isEdit) return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraftAvailable(true)
    } catch { /* ignore */ }
  }, [])

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.title) setTitle(draft.title)
        if (draft.description != null) setDescription(draft.description)
        if (draft.category) setCategory(draft.category)
        if (draft.coverImage) setCoverImage(draft.coverImage)
        if (draft.servings) setServings(draft.servings)
        if (draft.difficulty) setDifficulty(draft.difficulty)
        if (draft.cookTime) setCookTime(draft.cookTime)
        if (draft.tips != null) setTips(draft.tips)
        if (draft.story != null) setStory(draft.story)
        if (draft.culturalBackground != null) setCulturalBackground(draft.culturalBackground)
        if (draft.ingredients?.length) setIngredients(draft.ingredients)
        if (draft.steps?.length) setSteps(draft.steps)
      }
    } catch { /* ignore */ }
    setDraftAvailable(false)
    setDraftRestored(true)
  }

  const handleDiscardDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    setDraftAvailable(false)
  }

  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Auto-save effect (debounced, creation mode only)
  useEffect(() => {
    if (isEdit || submitting) return
    const timer = setTimeout(() => {
      const draft = { title, description, category, coverImage, servings, difficulty, cookTime, tips, story, culturalBackground, ingredients, steps, savedAt: Date.now() }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      setShowSaved(true)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000)
    }, 10000) // Save 10s after last change
    return () => clearTimeout(timer)
  }, [title, description, category, coverImage, servings, difficulty, cookTime, tips, story, culturalBackground, ingredients, steps, submitting])

  // ── Validation ──
  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {}
    if (step === 0 && !title.trim()) newErrors.title = '请输入食谱标题'
    if (step === 1 && !ingredients.some(i => i.name.trim())) newErrors.ingredients = '请至少添加一种食材'
    if (step === 2 && !steps.some(s => s.content.trim())) newErrors.steps = '请至少填写一个制作步骤'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  // Step navigation
  const goNextStep = () => {
    if (validateStep(currentStep) && currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    }
  }
  const goPrevStep = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1)
  }

  // 编辑模式：加载现有数据
  useEffect(() => {
    if (!id) return
    getRecipeById(id)
      .then((data: any) => {
        setTitle(data.title || '')
        setDescription(data.description || '')
        setCategory(data.category || '')
        setCoverImage(data.coverImage || data.image || '')
        setServings(data.servings || 2)
        setDifficulty(data.difficulty || 'easy')
        setCookTime(data.cookTime || 30)
        setTips(data.tips || '')
        setStory(data.story || '')
        setCulturalBackground(data.culturalBackground || '')
        setIngredients(data.ingredients?.length ? data.ingredients : [{ ...EMPTY_INGREDIENT }])
        setSteps(data.steps?.length ? data.steps : [{ ...EMPTY_STEP }])
      })
      .catch(() => {
        toast.error('食谱不存在')
        navigate('/')
      })
      .finally(() => setLoading(false))
  }, [id])

  // 未登录跳转
  useEffect(() => {
    if (!isAuthenticated) {
      toast.warning('请先登录')
      navigate('/login')
    }
  }, [isAuthenticated])

  // beforeunload 保护
  const hasContent = () => {
    return title.trim() || ingredients.some(i => i.name.trim()) || steps.some(s => s.content.trim())
  }
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasContent()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [title, ingredients, steps])

  // ── 食材操作 ──
  const addIngredient = () => {
    setIngredients([...ingredients, { ...EMPTY_INGREDIENT }])
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients]
    ;(updated[index] as any)[field] = value
    setIngredients(updated)
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  // ── 食材拖拽 ──
  const handleIngDragStart = (index: number) => { setDragIngIndex(index) }
  const handleIngDragOver = (index: number) => { setDragOverIngIndex(index) }
  const handleIngDragEnd = () => { setDragIngIndex(null); setDragOverIngIndex(null) }
  const handleIngDrop = (index: number) => {
    if (dragIngIndex === null || dragIngIndex === index) return
    const updated = [...ingredients]
    const [moved] = updated.splice(dragIngIndex, 1)
    updated.splice(index, 0, moved)
    setIngredients(updated)
    setDragIngIndex(null)
    setDragOverIngIndex(null)
  }

  // ── 步骤操作 ──
  const addStep = () => {
    setSteps([...steps, { stepNumber: steps.length + 1, content: '' }])
  }

  const updateStep = (index: number, value: string) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], content: value }
    setSteps(updated)
  }

  const removeStep = (index: number) => {
    if (steps.length <= 1) return
    const filtered = steps.filter((_, i) => i !== index)
    setSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  // ── 步骤拖拽 ──
  const handleStepDragStart = (index: number) => { setDragStepIndex(index) }
  const handleStepDragOver = (index: number) => { setDragOverStepIndex(index) }
  const handleStepDragEnd = () => { setDragStepIndex(null); setDragOverStepIndex(null) }
  const handleStepDrop = (index: number) => {
    if (dragStepIndex === null || dragStepIndex === index) return
    const updated = [...steps]
    const [moved] = updated.splice(dragStepIndex, 1)
    updated.splice(index, 0, moved)
    setSteps(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })))
    setDragStepIndex(null)
    setDragOverStepIndex(null)
  }

  // ── 富文本工具栏 ──
  const applyFormat = useCallback((stepIndex: number, wrapper: string) => {
    const textarea = stepTextareaRefs.current[stepIndex]
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return // 没有选中文本

    const text = steps[stepIndex].content
    const before = text.substring(0, start)
    const selected = text.substring(start, end)
    const after = text.substring(end)
    const wrapped = wrapper === '**' ? `**${selected}**` : `*${selected}*`

    const newText = before + wrapped + after
    updateStep(stepIndex, newText)

    // 恢复选区
    requestAnimationFrame(() => {
      textarea.focus()
      const newCursorPos = start + wrapper.length * 2 + selected.length
      textarea.setSelectionRange(start + wrapper.length, newCursorPos - wrapper.length)
    })
  }, [steps])

  // ── 导入数据 ──
  const formRef = useRef<HTMLFormElement>(null)

  const handleImportData = (imported: ImportedRecipe) => {
    setTitle(imported.title || '')
    setDescription(imported.description || '')
    setCoverImage(imported.coverImage || '')
    setServings(imported.servings || 2)
    setDifficulty(['easy', 'medium', 'hard'].includes(imported.difficulty) ? imported.difficulty : 'medium')
    setCookTime(imported.cookTime || 30)
    if (imported.ingredients?.length) {
      setIngredients(imported.ingredients)
    }
    if (imported.steps?.length) {
      setSteps(imported.steps)
    }
    if (imported.description && !description) {
      setDescription(imported.description)
    }
    // 导入成功后滚动到表单区域
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 500)
    toast.success('已导入食谱数据，请确认后发布')
  }

  // ── 提交 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrors({ ...errors, title: '请输入食谱标题' })
      setCurrentStep(0)
      return
    }

    setSubmitting(true)
    try {
      const data: CreateRecipeData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        coverImage: coverImage.trim() || undefined,
        servings: servings || undefined,
        difficulty: difficulty || undefined,
        cookTime: cookTime || undefined,
        tips: tips.trim() || undefined,
        story: story.trim() || undefined,
        culturalBackground: culturalBackground.trim() || undefined,
        ingredients: ingredients.filter(i => i.name.trim()),
        steps: steps
          .filter(s => s.content.trim())
          .map((s, i) => ({
            ...s,
            stepNumber: i + 1,
            content: s.content.trim(),
          })),
      }

      clearDraft()
      if (isEdit && id) {
        await updateRecipe(id, data)
        toast.success('食谱已更新')
        navigate(`/recipe/${id}`)
      } else if (forkFrom) {
        // ═══ #63: 改编模式 ── 使用 fork API
        const result = await forkRecipe(forkFrom, changesNote.trim() || undefined)
        toast.success('改编成功！正在跳转到新食谱...')
        navigate(`/recipe/${result.recipeId}`)
      } else {
        const result: any = await createRecipe(data)
        toast.success('食谱创建成功')
        navigate(`/recipe/${result.id}`)
      }
    } catch (err: any) {
      toast.error(err?.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 预览数据 ──
  const previewData = {
    title: title || '食谱标题',
    description,
    category,
    difficulty,
    servings,
    cookTime,
    tips,
    coverImage,
    ingredients: ingredients.filter(i => i.name.trim()),
    steps: steps.filter(s => s.content.trim()),
  }

  if (loading) {
    return (
      <div className="create-page">
        <PageSkeleton type="detail" />
      </div>
    )
  }

  return (
    <div className="create-page">
      <h1 className="create-title">{isEdit ? '编辑食谱' : '创建新食谱'}</h1>

      <div className="create-layout">
        {/* Left: Form */}
        <div className="create-form-wrap">
          {/* URL 导入（仅创建模式，非编辑模式） */}
          {!isEdit && (
            <ImportFromUrl onImport={handleImportData} />
          )}
          {/* Wizard Step Indicator */}
          <div className="create-wizard">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`wizard-step ${i < currentStep ? 'completed clickable' : i === currentStep ? 'active' : 'future'}`}
                onClick={() => { if (i < currentStep) { setCurrentStep(i) } }}
              >
                <div className="wizard-step-icon">
                  {i < currentStep ? '✓' : s.icon}
                </div>
                <span className="wizard-step-label">{s.label}</span>
                {i < STEPS.length - 1 && <div className="wizard-step-line">{i < currentStep ? '' : ''}</div>}
              </div>
            ))}
          </div>
          {/* 步骤进度条 */}
          <div className="create-wizard-progress">
            <div className="create-wizard-progress__bar"
              style={{ transform: `scaleX(${currentStep / (STEPS.length - 1) * 100}%)` }} />
          </div>

          {/* 草稿恢复提示 */}
          {draftAvailable && !draftRestored && (
            <div className="draft-notice">
              <span>📝 检测到未完成的草稿，是否继续编辑？</span>
              <div className="draft-notice__actions">
                <button className="form-btn" onClick={handleRestoreDraft}>恢复</button>
                <button className="form-btn form-btn--ghost" onClick={handleDiscardDraft}>放弃</button>
              </div>
            </div>
          )}

          {/* 错误摘要 */}
          {Object.keys(errors).length > 0 && (
            <div className="form-error-summary" role="alert">
              <span className="form-error-summary__title">⚠️ 请完成以下步骤：</span>
              <ul className="form-error-summary__list">
                {STEPS.filter(s => {
                  if (s.key === 'basic' && !title.trim()) return true
                  if (s.key === 'ingredients' && !ingredients.some(i => i.name.trim())) return true
                  if (s.key === 'steps' && !steps.some(s2 => s2.content.trim())) return true
                  return false
                }).map(s => (
                  <li key={s.key}>{s.label}</li>
                ))}
              </ul>
            </div>
          )}

          <form ref={formRef} className="create-form" onSubmit={handleSubmit}>
            {/* ═══ #63: 改编模式提示 ═══ */}
            {forkFrom && (
              <div className="fork-banner">
                <span className="fork-banner__icon">🍴</span>
                <div className="fork-banner__content">
                  <strong>改编自</strong>「{forkFromTitle || '加载中...'}」
                  <p className="fork-banner__hint">你可以自由修改所有字段，完成后将创建一份新的食谱</p>
                </div>
              </div>
            )}

            {/* Step 0: Basic Info */}
            <div className={`create-step ${currentStep !== 0 ? 'create-step--hidden' : ''}`}>
              <h2 className="create-step-title">📝 {isEdit ? '编辑食谱' : '基本信息'}</h2>

              <div className="form-group">
                <label className="form-label">食谱标题 *</label>
                <input
                  type="text"
                  className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                  value={title}
                  onChange={e => { setTitle(e.target.value); if (errors.title) setErrors({...errors, title: undefined}) }}
                  placeholder="给食谱取个名字…"
                  maxLength={100}
                />
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">简介</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="简单介绍一下这道菜…"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">分类</label>
                  <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="">请选择</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">难度</label>
                  <select className="form-select" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                    {DIFFICULTIES.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">份数</label>
                  <input type="number" className="form-input" value={servings} onChange={e => setServings(parseInt(e.target.value) || 1)} min={1} max={99} />
                </div>
                <div className="form-group">
                  <label className="form-label">烹饪时间（分钟）</label>
                  <input type="number" className="form-input" value={cookTime} onChange={e => setCookTime(parseInt(e.target.value) || 1)} min={1} max={999} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">封面图 URL</label>
                <div className="cover-input-group">
                  <div className="cover-input-row">
                    <input
                      type="url"
                      className="form-input"
                      value={coverImage}
                      onChange={e => setCoverImage(e.target.value)}
                      onPaste={(e: React.ClipboardEvent) => {
                        const text = e.clipboardData.getData('text')
                        if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)/i.test(text)) {
                          e.preventDefault()
                          setCoverImage(text)
                        }
                      }}
                      placeholder="封面图片链接（可选）"
                    />
                  </div>
                  {coverImage ? (
                    <div className="cover-preview cover-preview--has-image">
                      <img
                        src={coverImage}
                        alt="封面预览"
                        className="cover-preview__img"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  ) : (
                    <div
                      className="cover-preview"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const url = e.dataTransfer.getData('text/plain')
                        if (url.startsWith('http')) setCoverImage(url)
                      }}
                    >
                      <span className="cover-preview__placeholder">
                        <span className="cover-preview__placeholder-icon">🖼️</span>
                        粘贴或拖入图片链接
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1: Ingredients */}
            <div className={`create-step ${currentStep !== 1 ? 'create-step--hidden' : ''}`}>
              <h2 className="create-step-title">🥘 食材清单</h2>
              <p className="create-step-desc">添加食谱所需的全部食材及用量，拖拽行首 ≡ 可排序</p>

              <div className="form-group">
                {ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className={`form-ingredient-row ${errors.ingredients && !ing.name.trim() ? 'form-ingredient-row--error' : ''} ${dragOverIngIndex === i ? 'drag-over' : ''} ${dragIngIndex === i ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleIngDragStart(i)}
                    onDragOver={e => { e.preventDefault(); handleIngDragOver(i) }}
                    onDragEnd={handleIngDragEnd}
                    onDrop={e => { e.preventDefault(); handleIngDrop(i) }}
                  >
                    <span className="form-drag-handle">≡</span>
                    <input type="text" className="form-input form-ingredient-name" value={ing.name} onChange={e => { updateIngredient(i, 'name', e.target.value); if (errors.ingredients) setErrors({...errors, ingredients: undefined}) }} placeholder="食材名称" />
                    <input type="number" className="form-input form-ingredient-amount" value={ing.amount} onChange={e => updateIngredient(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="数量" min={0} step={0.1} />
                    <select className="form-select form-ingredient-unit" value={ing.unit} onChange={e => updateIngredient(i, 'unit', e.target.value)}>
                      {['g', 'kg', 'ml', 'L', '个', '根', '勺', '茶匙', '汤匙', '片', '瓣', '块', '只', '条', '碗'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <button type="button" className="form-btn-remove" onClick={() => removeIngredient(i)} disabled={ingredients.length <= 1} title="删除食材">✕</button>
                  </div>
                ))}
                <button type="button" className="form-btn-add" onClick={addIngredient}>+ 添加食材</button>
                {errors.ingredients && <span className="form-error">{errors.ingredients}</span>}
              </div>
            </div>

            {/* Step 2: Steps */}
            <div className={`create-step ${currentStep !== 2 ? 'create-step--hidden' : ''}`}>
              <h2 className="create-step-title">🍳 制作步骤</h2>
              <p className="create-step-desc">逐步描述烹饪过程，拖拽行首 ≡ 可排序，选中文字后点 B/I 加粗/斜体</p>

              <div className="form-group">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className={`form-step-row ${errors.steps && !step.content.trim() ? 'form-step-row--error' : ''} ${dragOverStepIndex === i ? 'drag-over' : ''} ${dragStepIndex === i ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => handleStepDragStart(i)}
                    onDragOver={e => { e.preventDefault(); handleStepDragOver(i) }}
                    onDragEnd={handleStepDragEnd}
                    onDrop={e => { e.preventDefault(); handleStepDrop(i) }}
                  >
                    <span className="form-drag-handle">≡</span>
                    <div className="form-step-number">{i + 1}</div>
                    <div className="form-step-editor">
                      <div className="form-step-toolbar">
                        <button type="button" className="toolbar-btn" onClick={() => applyFormat(i, '**')} title="加粗"><strong>B</strong></button>
                        <button type="button" className="toolbar-btn" onClick={() => applyFormat(i, '*')} title="斜体"><em>I</em></button>
                      </div>
                      <textarea
                        ref={el => { stepTextareaRefs.current[i] = el }}
                        className={`form-textarea form-step-input ${errors.steps && !step.content.trim() ? 'form-input--error' : ''}`}
                        value={step.content}
                        onChange={e => { updateStep(i, e.target.value); if (errors.steps) setErrors({...errors, steps: undefined}) }}
                        placeholder={`步骤 ${i + 1}`}
                        rows={3}
                      />
                    </div>
                    <button type="button" className="form-btn-remove" onClick={() => removeStep(i)} disabled={steps.length <= 1} title="删除步骤">✕</button>
                  </div>
                ))}
                <button type="button" className="form-btn-add" onClick={addStep}>+ 添加步骤</button>
                {errors.steps && <span className="form-error">{errors.steps}</span>}
              </div>
            </div>

            {/* Step 3: Advanced */}
            <div className={`create-step ${currentStep !== 3 ? 'create-step--hidden' : ''}`}>
              <h2 className="create-step-title">⚙️ 更多设置</h2>
              <p className="create-step-desc">添加其他信息，让食谱更完整</p>

              <div className="form-group">
                <label className="form-label">烹饪小贴士</label>
                <textarea className="form-textarea" value={tips} onChange={e => setTips(e.target.value)} placeholder="分享一些烹饪技巧和注意事项..." rows={3} maxLength={500} />
                <span className="form-hint">可选，填写烹饪技巧、注意事项等</span>
              </div>

              {/* ═══ #63: 改编说明 ═══ */}
              {forkFrom && (
                <div className="form-group">
                  <label className="form-label">📝 改编说明</label>
                  <textarea className="form-textarea changes-note-input" value={changesNote} onChange={e => setChangesNote(e.target.value)} placeholder="说明你做了什么改动，比如：减少了糖量、增加了辣度、替换了某种食材..." rows={3} maxLength={500} />
                  <span className="form-hint">可选，向读者说明你的改编思路</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">📖 食谱故事</label>
                <textarea className="form-textarea" value={story} onChange={e => setStory(e.target.value)} placeholder="介绍这道食谱的灵感来源或背后的故事..." rows={3} maxLength={1000} />
                <span className="form-hint">可选，让读者了解这道菜的来历和灵感</span>
              </div>

              <div className="form-group">
                <label className="form-label">🌍 文化背景</label>
                <textarea className="form-textarea" value={culturalBackground} onChange={e => setCulturalBackground(e.target.value)} placeholder="介绍这道菜的文化背景、历史渊源或传统习俗..." rows={3} maxLength={1000} />
                <span className="form-hint">可选，介绍食谱的文化背景和传统知识</span>
              </div>
            </div>

            {/* Step Navigation */}
            <div className="create-actions">
              {showSaved && <span className="draft-saved-indicator">已保存 ✓</span>}
              {currentStep > 0 && (
                <button type="button" className="btn btn--outline" onClick={goPrevStep}>
                  ← 上一步
                </button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <button type="button" className="btn btn--primary" onClick={goNextStep}>
                  下一步 →
                </button>
              ) : (
                <button type="submit" className="btn btn--primary" disabled={submitting || !title.trim() || !ingredients.some(i => i.name.trim()) || !steps.some(s => s.content.trim())}>
                  {submitting ? '提交中…' : isEdit ? '保存修改' : forkFrom ? '🍴 发布改编' : '✨ 发布食谱'}
                </button>
              )}
              {currentStep === 0 && (
                <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>取消</button>
              )}
            </div>
          </form>
          {/* 移动端预览 FAB */}
          {currentStep < STEPS.length - 1 && (
            <>
              <button className="preview-fab" onClick={() => setPreviewOpen(true)} aria-label="预览食谱">
                👁
              </button>
              {previewOpen && (
                <>
                  <div className="preview-drawer-overlay" onClick={() => setPreviewOpen(false)} />
                  <div className="preview-drawer">
                    <div className="preview-drawer__handle" />
                    <div className="preview-drawer__header">
                      <h3>📋 食谱预览</h3>
                      <button className="preview-drawer__close" onClick={() => setPreviewOpen(false)}>✕</button>
                    </div>
                    <div className="preview-drawer__body">
                      <div className="preview-card">
                        {previewData.coverImage ? (
                          <div className="preview-cover">
                            <img src={previewData.coverImage} alt={previewData.title || '预览'} />
                          </div>
                        ) : (
                          <div className="preview-cover preview-cover--placeholder">
                            <span>📸</span>
                          </div>
                        )}
                        <div className="preview-body">
                          <h2 className="preview-name">{previewData.title || '未命名食谱'}</h2>
                          <div className="preview-tags">
                            {previewData.category && <span className="preview-tag">{CATEGORY_LABELS[previewData.category] || previewData.category}</span>}
                            {previewData.difficulty && <span className="preview-tag">{DIFFICULTY_LABELS[previewData.difficulty] || previewData.difficulty}</span>}
                            {previewData.servings && <span className="preview-tag">{previewData.servings} 人份</span>}
                            {previewData.cookTime && <span className="preview-tag">⏱ {previewData.cookTime} 分钟</span>}
                          </div>
                          {previewData.description && <p className="preview-desc">{previewData.description}</p>}
                          {previewData.ingredients.length > 0 && (
                            <div className="preview-section">
                              <h4>食材</h4>
                              <ul className="preview-ingredients">
                                {previewData.ingredients.map((ing: any, i: number) => (
                                  <li key={i}>{ing.amount > 0 ? `${ing.amount}${ing.unit} ` : ''}{ing.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {previewData.steps.length > 0 && (
                            <div className="preview-section">
                              <h4>步骤</h4>
                              <ol className="preview-steps">
                                {previewData.steps.map((step: any, i: number) => (
                                  <li key={i}>{step.content}</li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right: Preview */}
        <div className="create-preview">
          <div className="preview-sticky">
            <h3 className="preview-title">实时预览</h3>
            <div className="preview-card">
              {/* Cover */}
              {previewData.coverImage ? (
                <div className="preview-cover">
                  <img src={previewData.coverImage} alt={previewData.title} />
                </div>
              ) : (
                <div className="preview-cover preview-cover--placeholder">
                  <span>📸</span>
                </div>
              )}

              {/* Info */}
              <div className="preview-body">
                <h2 className="preview-name">{previewData.title}</h2>

                <div className="preview-tags">
                  {previewData.category && <span className="preview-tag">{CATEGORY_LABELS[previewData.category] || previewData.category}</span>}
                  {previewData.difficulty && <span className="preview-tag">{DIFFICULTY_LABELS[previewData.difficulty] || previewData.difficulty}</span>}
                  {previewData.servings && <span className="preview-tag">{previewData.servings} 人份</span>}
                  {previewData.cookTime && <span className="preview-tag">⏱ {previewData.cookTime} 分钟</span>}
                </div>

                {previewData.description && <p className="preview-desc">{previewData.description}</p>}

                {/* Ingredients */}
                {previewData.ingredients.length > 0 && (
                  <div className="preview-section">
                    <h4>食材</h4>
                    <ul className="preview-ingredients">
                      {previewData.ingredients.map((ing, i) => (
                        <li key={i}>
                          {ing.amount > 0 ? `${ing.amount}${ing.unit} ` : ''}{ing.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                {previewData.steps.length > 0 && (
                  <div className="preview-section">
                    <h4>步骤</h4>
                    <ol className="preview-steps">
                      {previewData.steps.map((step, i) => (
                        <li key={i}>
                          {step.content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>
                            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) return <em key={j}>{part.slice(1, -1)}</em>
                            return <span key={j}>{part}</span>
                          })}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Tips */}
                {previewData.tips && (
                  <div className="preview-section preview-tips">
                    <h4>💡 小贴士</h4>
                    <p>{previewData.tips}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}