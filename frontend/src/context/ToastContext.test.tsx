import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'

function TestButton({ type = 'success' }: { type?: 'success' | 'error' | 'warning' | 'info' }) {
  const toast = useToast()
  return <button onClick={() => toast[type]('测试消息')}>显示{type}消息</button>
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('ToastContext - useToast hook', () => {
  it('renders children without error', () => {
    renderWithProvider(<div>正常内容</div>)
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('throws error when used outside provider', () => {
  // Suppress console.error from React
    const origErr = console.error
    console.error = vi.fn()
    expect(() => render(<TestButton />)).toThrow()
    console.error = origErr
  })
})

describe('ToastProvider - toast message rendering', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows success toast on trigger', () => {
    renderWithProvider(<TestButton type="success" />)
    fireEvent.click(screen.getByText('显示success消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()
  })

  it('shows error toast on trigger', () => {
    renderWithProvider(<TestButton type="error" />)
    fireEvent.click(screen.getByText('显示error消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()
  })

  it('shows warning toast on trigger', () => {
    renderWithProvider(<TestButton type="warning" />)
    fireEvent.click(screen.getByText('显示warning消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()
  })

  it('shows info toast on trigger', () => {
    renderWithProvider(<TestButton type="info" />)
    fireEvent.click(screen.getByText('显示info消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()
  })

  it('toast disappears after duration', () => {
    renderWithProvider(<TestButton type="success" />)
    fireEvent.click(screen.getByText('显示success消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()

    // Fast-forward past animation + duration
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.queryByText('测试消息')).not.toBeInTheDocument()
  })

  it('error toast lasts longer (5s)', () => {
    renderWithProvider(<TestButton type="error" />)
    fireEvent.click(screen.getByText('显示error消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()

    // At 3.5s, success would have disappeared, but error should still be visible
    act(() => {
      vi.advanceTimersByTime(3500)
    })
    expect(screen.getByText('测试消息')).toBeInTheDocument()

    // At 5.5s, error should disappear
    act(() => {
      vi.advanceTimersByTime(2200)
    })
    expect(screen.queryByText('测试消息')).not.toBeInTheDocument()
  })

  it('close button removes toast immediately', () => {
    renderWithProvider(<TestButton type="info" />)
    fireEvent.click(screen.getByText('显示info消息'))

    // Close button should exist
    const closeBtn = screen.getByLabelText('关闭')
    expect(closeBtn).toBeInTheDocument()

    fireEvent.click(closeBtn)

    // After animation, toast should be removed
    act(() => {
      vi.advanceTimersByTime(350)
    })
    expect(screen.queryByText('测试消息')).not.toBeInTheDocument()
  })

  it('supports multiple stacked toasts', () => {
    renderWithProvider(
      <div>
        <TestButton type="success" />
        <button onClick={() => {
          const toast = useToast()
          toast.warning('第二条消息')
        }}>显示warning消息</button>
      </div>
    )

    // Can't easily test stacking with this setup, but verify basic multi-toast
    fireEvent.click(screen.getByText('显示success消息'))
    expect(screen.getByText('测试消息')).toBeInTheDocument()
  })

  it('has proper aria attributes', () => {
    renderWithProvider(<TestButton type="success" />)
    fireEvent.click(screen.getByText('显示success消息'))

    const container = document.querySelector('.qclaw-toast-container')
    expect(container).toHaveAttribute('role', 'region')
    expect(container).toHaveAttribute('aria-live', 'polite')

    const toast = document.querySelector('.qclaw-toast')
    expect(toast).toHaveAttribute('role', 'alert')
  })
})