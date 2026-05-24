import React, { useState, useEffect, useCallback } from 'react'
import './WelcomeTour.css'

const TOUR_STORAGE_KEY = 'food_website_tour_completed'
const TOUR_VERSION = 1

interface TourStep {
  targetSelector: string
  title: string
  content: string
  icon: string
  position?: 'bottom' | 'top' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '.navbar__logo',
    title: '欢迎来到美食食谱 🍳',
    content: '这里是你的私人食谱收藏馆，发现、创作、分享美味佳肴！让我们快速带你熟悉核心功能。',
    icon: '👋',
    position: 'bottom',
  },
  {
    targetSelector: 'input[type="text"][placeholder*="搜索"], input[type="search"]',
    title: '🔍 搜索食谱',
    content: '在这里搜索你想做的菜——按菜名、食材、分类，一搜即得。还支持按标签筛选（如「快手菜」「减脂餐」）。',
    icon: '🔍',
    position: 'bottom',
  },
  {
    targetSelector: '[href="/recipe/new"], .navbar__link--create',
    title: '✏️ 创建食谱',
    content: '想分享你的拿手菜？点击这里发布新食谱，包含食材、步骤、图片，支持版本管理哦！',
    icon: '✏️',
    position: 'bottom',
  },
  {
    targetSelector: '[href="/favorites"], .fab-btn--favorite',
    title: '❤️ 收藏食谱',
    content: '看到喜欢的食谱？点击心形按钮收藏，方便以后随时查看。收藏的食谱会同步到个人中心。',
    icon: '❤️',
    position: 'top',
  },
  {
    targetSelector: '[href="/user"], .navbar__link[href*="user"]',
    title: '👤 个人中心',
    content: '在这里管理你的食谱、收藏夹、浏览足迹，还可以查看烹饪日志和个人统计数据。',
    icon: '👤',
    position: 'top',
  },
  {
    targetSelector: '.mobile-bottom-nav, .navbar__links',
    title: '🚀 更多功能',
    content: '使用快捷键 ? 可查看全部快捷键列表。Ctrl+K 快速搜索，Ctrl+N 快速新建食谱。快去探索吧！',
    icon: '🚀',
    position: 'top',
  },
]

const WelcomeTour: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const updatePosition = useCallback(() => {
    const step = TOUR_STEPS[activeStep]
    const el = document.querySelector(step.targetSelector)
    if (!el) {
      // Fall back to center of screen
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      })
      setTargetRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)
    const pos = step.position || 'bottom'
    const gap = 12
    let style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 100001,
    }
    switch (pos) {
      case 'bottom':
        style.top = rect.bottom + gap
        style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 352))
        break
      case 'top':
        style.top = Math.max(8, rect.top - gap - 180)
        style.left = Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 352))
        break
      case 'left':
        style.top = Math.max(8, rect.top + rect.height / 2 - 90)
        style.left = Math.max(8, rect.left - 328 - gap)
        break
      case 'right':
        style.top = Math.max(8, rect.top + rect.height / 2 - 90)
        style.left = rect.right + gap
        break
    }
    setTooltipStyle(style)
  }, [activeStep])

  useEffect(() => {
    if (!isVisible) return
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isVisible, updatePosition])

  const handleNext = () => {
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(prev => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handleSkip = () => {
    handleFinish()
  }

  const handleFinish = () => {
    setIsVisible(false)
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ version: TOUR_VERSION, completedAt: Date.now() }))
    } catch { /* localStorage not available */ }
  }

  if (!isVisible) return null

  const step = TOUR_STEPS[activeStep]
  const progress = ((activeStep + 1) / TOUR_STEPS.length) * 100

  return (
    <>
      {/* Overlay with highlight */}
      <div className="tour-overlay" onClick={handleSkip} />
      {targetRect && (
        <div
          className="tour-highlight"
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            zIndex: 100000,
          }}
        />
      )}
      {/* Tooltip */}
      <div className="tour-tooltip" style={tooltipStyle} role="dialog" aria-label={step.title}>
        <div className="tour-tooltip__icon">{step.icon}</div>
        <h3 className="tour-tooltip__title">{step.title}</h3>
        <p className="tour-tooltip__content">{step.content}</p>
        <div className="tour-tooltip__progress">
          <div className="tour-tooltip__progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="tour-tooltip__actions">
          <button className="tour-tooltip__skip" onClick={handleSkip}>
            跳过引导
          </button>
          <span className="tour-tooltip__counter">
            {activeStep + 1} / {TOUR_STEPS.length}
          </span>
          <button className="tour-tooltip__next" onClick={handleNext}>
            {activeStep < TOUR_STEPS.length - 1 ? '下一步 →' : '完成 🎉'}
          </button>
        </div>
      </div>
    </>
  )
}

export default WelcomeTour