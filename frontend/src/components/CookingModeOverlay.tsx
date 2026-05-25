import { useState, useEffect, useCallback, useRef } from 'react'
import StepTimer from './StepTimer'
import './CookingModeOverlay.css'

interface Step {
  stepNumber: number
  content: string
  image?: string
}

interface CookingModeOverlayProps {
  visible: boolean
  steps: Step[]
  initialStepIndex?: number
  onClose: () => void
  // Speech
  speak: (text: string, onEnd?: () => void) => void
  stopSpeech: () => void
  speaking: boolean
}

export default function CookingModeOverlay({
  visible,
  steps,
  initialStepIndex = 0,
  onClose,
  speak,
  stopSpeech,
  speaking,
}: CookingModeOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(initialStepIndex)
  const [autoSpeaking, setAutoSpeaking] = useState(false)
  const autoRef = useRef(false)

  const currentStep = steps[currentIdx]

  useEffect(() => {
    setCurrentIdx(initialStepIndex)
  }, [initialStepIndex])

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, onClose])

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      stopSpeech()
      setAutoSpeaking(false)
      setCurrentIdx(i => i - 1)
    }
  }, [currentIdx, stopSpeech])

  const goNext = useCallback(() => {
    if (currentIdx < steps.length - 1) {
      stopSpeech()
      setAutoSpeaking(false)
      setCurrentIdx(i => i + 1)
    }
  }, [currentIdx, steps.length, stopSpeech])

  const toggleReadAloud = useCallback(() => {
    if (speaking) {
      stopSpeech()
      setAutoSpeaking(false)
    } else {
      setAutoSpeaking(true)
      speak(currentStep?.content || '', () => {
        // Auto-advance to next step when speech finishes
        if (autoRef.current && currentIdx < steps.length - 1) {
          setCurrentIdx(i => i + 1)
        } else if (autoRef.current) {
          setAutoSpeaking(false)
        }
      })
    }
  }, [speaking, currentStep, currentIdx, steps.length, speak, stopSpeech])

  // Track autoRef so closure captures latest value
  useEffect(() => { autoRef.current = autoSpeaking }, [autoSpeaking])

  // Speak when step changes while auto-speaking
  useEffect(() => {
    if (autoSpeaking && currentStep) {
      speak(currentStep.content, () => {
        if (autoRef.current && currentIdx < steps.length - 1) {
          setCurrentIdx(i => i + 1)
        } else if (autoRef.current) {
          setAutoSpeaking(false)
        }
      })
    }
  }, [currentIdx, autoSpeaking]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !currentStep) return null

  const stepCount = steps.length
  const isFirst = currentIdx === 0
  const isLast = currentIdx === stepCount - 1

  return (
    <div className="cooking-mode" role="dialog" aria-label="烹饪模式">
      {/* Header */}
      <div className="cooking-mode__header">
        <div className="cooking-mode__header-left">
          <span className="cooking-mode__step-count">
            第 {currentIdx + 1} / {stepCount} 步
          </span>
          <span className="cooking-mode__separator">|</span>
          <StepTimer stepNumber={currentStep.stepNumber} stepContent={currentStep.content} />
        </div>
        <div className="cooking-mode__header-right">
          {/* 语音按钮 */}
          <button
            className={`cooking-mode__speak-btn ${speaking ? 'is-speaking' : ''}`}
            onClick={toggleReadAloud}
            aria-label={speaking ? '停止朗读' : '朗读步骤'}
            title={speaking ? '停止朗读' : '朗读步骤'}
          >
            {speaking ? '🔊' : '🔇'}
          </button>
          {/* 关闭 */}
          <button
            className="cooking-mode__close-btn"
            onClick={onClose}
            aria-label="退出烹饪模式"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="cooking-mode__body">
        <div className="cooking-mode__step-number-badge">
          {currentStep.stepNumber}
        </div>
        <p className="cooking-mode__step-content">{currentStep.content}</p>

        {/* Step image */}
        {currentStep.image && (
          <img
            src={currentStep.image}
            alt={`步骤 ${currentStep.stepNumber}`}
            className="cooking-mode__step-image"
            loading="lazy"
          />
        )}

        {/* Progress bar */}
        <div className="cooking-mode__progress">
          <div
            className="cooking-mode__progress-fill"
            style={{ width: `${((currentIdx + 1) / stepCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="cooking-mode__nav">
        <button
          className={`cooking-mode__nav-btn ${isFirst ? 'is-disabled' : ''}`}
          onClick={goPrev}
          disabled={isFirst}
          aria-label="上一步"
        >
          ◀
        </button>

        {/* Center: swipe hint + step indicator */}
        <div className="cooking-mode__step-dots">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`cooking-mode__dot ${i === currentIdx ? 'is-active' : ''} ${i < currentIdx ? 'is-done' : ''}`}
              onClick={() => {
                stopSpeech()
                setAutoSpeaking(false)
                setCurrentIdx(i)
              }}
            />
          ))}
        </div>

        <button
          className={`cooking-mode__nav-btn ${isLast ? 'is-disabled' : ''}`}
          onClick={goNext}
          disabled={isLast}
          aria-label="下一步"
        >
          ▶
        </button>
      </div>

      {/* Gesture zone: swipe left/right */}
      <SwipeZone onSwipeLeft={goNext} onSwipeRight={goPrev} />
    </div>
  )
}

/** 全屏触摸滑动区域 */
function SwipeZone({ onSwipeLeft, onSwipeRight }: { onSwipeLeft: () => void; onSwipeRight: () => void }) {
  const touchStart = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart.current === null) return
      const diff = e.changedTouches[0].clientX - touchStart.current
      touchStart.current = null

      if (Math.abs(diff) < 50) return
      if (diff > 0) onSwipeRight()
      else onSwipeLeft()
    },
    [onSwipeLeft, onSwipeRight]
  )

  return (
    <div
      className="cooking-mode__swipe-zone"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    />
  )
}