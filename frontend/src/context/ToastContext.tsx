import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
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

// ── ToastProvider ──────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null)

  const createToast = useCallback((message: string, type: ToastType) => {
    setToast({ id: Date.now(), message, type })
  }, [])

  // 2.5s 后自动清除
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const value: ToastContextValue = {
    success: useCallback((msg: string) => createToast(msg, 'success'), [createToast]),
    error: useCallback((msg: string) => createToast(msg, 'error'), [createToast]),
    warning: useCallback((msg: string) => createToast(msg, 'warning'), [createToast]),
    info: useCallback((msg: string) => createToast(msg, 'info'), [createToast]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className={`qclaw-toast qclaw-toast--${toast.type}`} role="alert" aria-live="polite">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
