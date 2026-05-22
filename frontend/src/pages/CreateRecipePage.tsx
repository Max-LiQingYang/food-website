import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createRecipe, updateRecipe, getRecipeById } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import type { CreateRecipeData } from '../api'
import './CreateRecipePage.css'

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
  const [ingredients, setIngredients] = useState<Array<{name: string; amount: number; unit: string}>>([
    { ...EMPTY_INGREDIENT }
  ])
  const [steps, setSteps] = useState<Array<{stepNumber: number; content: string; image?: string}>>([
    { ...EMPTY_STEP }
  ])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // 编辑模式：加载现有数据
  useEffect(() => {
    if (!id) return
    getRecipeById(id)
      .then((data: any) => {
        setTitle(data.title || '')
        setDescription(data.description || '')
        setCategory(data.category || '')
        setCoverImage(data.coverImage || '')
        setServings(data.servings || 2)
        setDifficulty(data.difficulty || 'easy')
        setCookTime(data.cookTime || 30)
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
    // 重编号
    setSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })))
  }

  // ── 提交 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.warning('请输入食谱标题')
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
        ingredients: ingredients.filter(i => i.name.trim()),
        steps: steps.filter(s => s.content.trim()).map((s, i) => ({
          ...s,
          stepNumber: i + 1,
          content: s.content.trim()
        })),
      }

      if (isEdit && id) {
        await updateRecipe(id, data)
        toast.success('食谱已更新')
        navigate(`/recipe/${id}`)
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

  if (loading) {
    return (
      <div className="create-page">
        <div className="create-skeleton">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-box skeleton-line" style={{ marginBottom: 16 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="create-page">
      <div className="create-container">
        <h1 className="create-title">{isEdit ? '编辑食谱' : '创建新食谱'}</h1>

        <form className="create-form" onSubmit={handleSubmit}>
          {/* 标题 */}
          <div className="form-group">
            <label className="form-label">食谱标题 *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给食谱取个名字…"
              maxLength={100}
              required
            />
          </div>

          {/* 简介 */}
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

          {/* 分类 + 难度 */}
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

          {/* 份数 + 烹饪时间 */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">份数</label>
              <input
                type="number"
                className="form-input"
                value={servings}
                onChange={e => setServings(parseInt(e.target.value) || 1)}
                min={1}
                max={99}
              />
            </div>
            <div className="form-group">
              <label className="form-label">烹饪时间（分钟）</label>
              <input
                type="number"
                className="form-input"
                value={cookTime}
                onChange={e => setCookTime(parseInt(e.target.value) || 1)}
                min={1}
                max={999}
              />
            </div>
          </div>

          {/* 封面图 */}
          <div className="form-group">
            <label className="form-label">封面图 URL</label>
            <input
              type="url"
              className="form-input"
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="https://example.com/image.jpg（可选）"
            />
          </div>

          {/* 食材 */}
          <div className="form-group">
            <label className="form-label">食材</label>
            {ingredients.map((ing, i) => (
              <div key={i} className="form-ingredient-row">
                <input
                  type="text"
                  className="form-input form-ingredient-name"
                  value={ing.name}
                  onChange={e => updateIngredient(i, 'name', e.target.value)}
                  placeholder="食材名称"
                />
                <input
                  type="number"
                  className="form-input form-ingredient-amount"
                  value={ing.amount}
                  onChange={e => updateIngredient(i, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="数量"
                  min={0}
                  step={0.1}
                />
                <select
                  className="form-select form-ingredient-unit"
                  value={ing.unit}
                  onChange={e => updateIngredient(i, 'unit', e.target.value)}
                >
                  {['g','kg','ml','L','个','根','勺','茶匙','汤匙','片','瓣','块','只','条','碗'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="form-btn-remove"
                  onClick={() => removeIngredient(i)}
                  disabled={ingredients.length <= 1}
                  title="删除食材"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="form-btn-add" onClick={addIngredient}>
              + 添加食材
            </button>
          </div>

          {/* 步骤 */}
          <div className="form-group">
            <label className="form-label">制作步骤</label>
            {steps.map((step, i) => (
              <div key={i} className="form-step-row">
                <div className="form-step-number">{i + 1}</div>
                <textarea
                  className="form-textarea form-step-input"
                  value={step.content}
                  onChange={e => updateStep(i, e.target.value)}
                  placeholder={`步骤 ${i + 1}`}
                  rows={2}
                />
                <button
                  type="button"
                  className="form-btn-remove"
                  onClick={() => removeStep(i)}
                  disabled={steps.length <= 1}
                  title="删除步骤"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="form-btn-add" onClick={addStep}>
              + 添加步骤
            </button>
          </div>

          {/* 提交 */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => navigate(-1)}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? '提交中…' : isEdit ? '保存修改' : '发布食谱'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}