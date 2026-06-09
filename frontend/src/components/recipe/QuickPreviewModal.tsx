import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getRecipeById } from '../../api'
import type { Recipe, RecipeDetail } from '../../api'
import './QuickPreviewModal.css'

interface QuickPreviewModalProps {
  recipe: Recipe
  onClose: () => void
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export default function QuickPreviewModal({ recipe, onClose }: QuickPreviewModalProps) {
  const navigate = useNavigate()
  const [fullRecipe, setFullRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Store the element that triggered the modal for focus restoration
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement
  }, [])

  // Fetch full recipe data if steps/ingredients missing
  useEffect(() => {
    const hasSteps = Array.isArray((recipe as any).steps) && (recipe as any).steps.length > 0
    const hasIngredients = Array.isArray((recipe as any).ingredients) && (recipe as any).ingredients.length > 0

    if (hasSteps && hasIngredients) {
      setFullRecipe(recipe as RecipeDetail)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    getRecipeById(recipe.id)
      .then((res: any) => {
        if (controller.signal.aborted) return
        const data = res.data?.data || res.data || res
        setFullRecipe(data)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('[QuickPreviewModal] Failed to fetch recipe:', err)
        setFullRecipe(recipe as RecipeDetail)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [recipe])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Esc to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Focus management
  useEffect(() => {
    // Focus the modal for keyboard users
    requestAnimationFrame(() => {
      modalRef.current?.focus()
    })
  }, [])

  // Overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  const handleViewDetail = useCallback(() => {
    onClose()
    navigate(`/recipe/${recipe.id}`)
  }, [onClose, navigate, recipe.id])

  // Close and restore focus
  const handleClose = useCallback(() => {
    onClose()
    // Restore focus to trigger element
    requestAnimationFrame(() => {
      triggerRef.current?.focus()
    })
  }, [onClose])

  // Data extraction
  const ingredients = fullRecipe?.ingredients || []
  const steps = fullRecipe?.steps || []
  const displayIngredients = ingredients.slice(0, 8)
  const displaySteps = steps.slice(0, 3)
  const extraIngredients = Math.max(0, ingredients.length - 8)
  const description = recipe.description || ''
  const truncatedDesc = description.length > 100 ? description.slice(0, 100) + '…' : description

  const content = (
    <div className="preview-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`快速预览: ${recipe.title}`}
        tabIndex={-1}
      >
        {/* Close button */}
        <button className="preview-modal__close" onClick={handleClose} aria-label="关闭">
          ×
        </button>

        {/* Cover image */}
        <div className="preview-modal__cover">
          {recipe.coverImage ? (
            <img src={recipe.coverImage} alt={recipe.title} className="preview-modal__cover-img" />
          ) : (
            <div className="preview-modal__cover-placeholder">🍽️</div>
          )}
        </div>

        {/* Content */}
        <div className="preview-modal__body">
          {/* Title + tags */}
          <h2 className="preview-modal__title">{recipe.title}</h2>
          <div className="preview-modal__tags">
            {recipe.difficulty && DIFFICULTY_LABELS[recipe.difficulty.toLowerCase()] && (
              <span className="preview-modal__tag">
                {recipe.difficulty.toLowerCase() === 'easy' ? '🟢' : recipe.difficulty.toLowerCase() === 'medium' ? '🟡' : '🔴'}{' '}
                {DIFFICULTY_LABELS[recipe.difficulty.toLowerCase()]}
              </span>
            )}
            {recipe.cookTime != null && (
              <span className="preview-modal__tag">⏱ {recipe.cookTime}分钟</span>
            )}
            {recipe.avgRating != null && recipe.avgRating > 0 && (
              <span className="preview-modal__tag">★ {recipe.avgRating.toFixed(1)}</span>
            )}
            {recipe.servings != null && (
              <span className="preview-modal__tag">👥 {recipe.servings}人份</span>
            )}
          </div>

          {/* Description */}
          {truncatedDesc && (
            <p className="preview-modal__desc">{truncatedDesc}</p>
          )}

          {/* Ingredients */}
          {displayIngredients.length > 0 && (
            <div className="preview-modal__section">
              <h3 className="preview-modal__section-title">📋 食材清单</h3>
              <div className="preview-modal__ingredients">
                {displayIngredients.map((ing, i) => (
                  <div key={i} className="preview-modal__ingredient-item">
                    <span className="preview-modal__ingredient-name">{ing.name}</span>
                    <span className="preview-modal__ingredient-amount">
                      {ing.amount}{ing.unit}
                    </span>
                  </div>
                ))}
                {extraIngredients > 0 && (
                  <div className="preview-modal__ingredient-more">
                    +{extraIngredients} 种更多食材
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Steps */}
          {displaySteps.length > 0 && (
            <div className="preview-modal__section">
              <h3 className="preview-modal__section-title">📝 步骤概要</h3>
              <div className="preview-modal__steps">
                {displaySteps.map((step) => (
                  <div key={step.stepNumber} className="preview-modal__step-item">
                    <span className="preview-modal__step-num">{step.stepNumber}</span>
                    <span className="preview-modal__step-text">{step.content}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state for data fetch */}
          {loading && !displayIngredients.length && !displaySteps.length && (
            <div className="preview-modal__loading">
              <span className="preview-modal__loading-spinner" />
              加载中…
            </div>
          )}

          {/* CTA */}
          <button className="preview-modal__cta" onClick={handleViewDetail}>
            查看详情 →
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
