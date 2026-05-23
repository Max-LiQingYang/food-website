import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  exiting?: boolean
}

interface ToastContextValue {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
}

const TOAST_DURATION = 3000
const ANIMATION_DURATION = 300

// ── ToastProvider ──────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    // Start exit animation
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)))
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, ANIMATION_DURATION)
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, message, type }])

      // Auto dismiss
      setTimeout(() => dismissToast(id), TOAST_DURATION)
    },
    [dismissToast]
  )

  const value: ToastContextValue = {
    success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
    error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
    warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
    info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast stack */}
      <div className="qclaw-toast-container" role="region" aria-live="polite">
        {toasts.map((toast, index) => {
          const reverseIndex = toasts.length - 1 - index
          return (
            <div
              key={toast.id}
              className={`qclaw-toast qclaw-toast--${toast.type} ${
                toast.exiting ? 'qclaw-toast--exiting' : 'qclaw-toast--entering'
              }`}
              style={{
                transform: `translate(-50%, calc(-50% - ${reverseIndex * 8}px))`,
                zIndex: 9999 + reverseIndex,
              }}
              onClick={() => dismissToast(toast.id)}
              role="alert"
            >
              <span className="qclaw-toast__icon">{TOAST_ICONS[toast.type]}</span>
              <span className="qclaw-toast__message">{toast.message}</span>
              <button
                className="qclaw-toast__close"
                onClick={e => {
                  e.stopPropagation()
                  dismissToast(toast.id)
                }}
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}