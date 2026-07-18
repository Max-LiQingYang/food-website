import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './CrossFlowToast.css'

// ── AC4: CrossFlowToast 跨页 Toast 引导 ──
// ── AC6: a11y 合规（aria-live polite + 44px + focus-visible + 4.5:1 contrast）──

export interface CrossFlowToastData {
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
  actionText?: string
  actionPath?: string
  duration?: number
}

interface CrossFlowToastContextValue {
  show: (data: CrossFlowToastData) => void
  dismiss: () => void
}

const CrossFlowToastContext = createContext<CrossFlowToastContextValue | null>(null)

export function useCrossFlowToast(): CrossFlowToastContextValue {
  const ctx = useContext(CrossFlowToastContext)
  if (!ctx) {
    // Graceful fallback - returns no-op if provider not mounted
    return {
      show: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}

export function CrossFlowToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<CrossFlowToastData | null>(null)
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const actionLinkRef = useRef<HTMLAnchorElement | null>(null)
  const navigate = useNavigate()

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setToast(null)
      setExiting(false)
    }, 300)
  }, [])

  const show = useCallback((data: CrossFlowToastData) => {
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current)
    setExiting(false)
    setToast(data)
    const duration = data.duration ?? 4000
    timerRef.current = setTimeout(() => dismiss(), duration)
  }, [dismiss])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const handleActionClick = useCallback(() => {
    if (toast?.actionPath) {
      dismiss()
      navigate(toast.actionPath)
    }
  }, [toast, dismiss, navigate])

  return (
    <CrossFlowToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <div
          className={`cross-flow-toast ${exiting ? 'cross-flow-toast--exiting' : 'cross-flow-toast--enter'}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="cross-flow-toast__content">
            <span className="cross-flow-toast__icon" aria-hidden="true">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="cross-flow-toast__message">{toast.message}</span>
            {toast.actionText && toast.actionPath && (
              <a
                ref={actionLinkRef}
                href={toast.actionPath}
                onClick={(e) => { e.preventDefault(); handleActionClick() }}
                className="cross-flow-toast__action"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                {toast.actionText}
              </a>
            )}
            <button
              className="cross-flow-toast__close"
              onClick={dismiss}
              aria-label="关闭提示"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </CrossFlowToastContext.Provider>
  )
}

// ── CrossFlowToast standalone component (for layout-level mounting) ──
// This wraps the provider; use <CrossFlowToastProvider> in router layout
export default function CrossFlowToast({ children }: { children?: React.ReactNode }) {
  return (
    <CrossFlowToastProvider>{children}</CrossFlowToastProvider>
  )
}
