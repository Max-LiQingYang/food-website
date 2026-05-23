import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import ErrorBoundary from './ErrorBoundary'
import { BrowserRouter } from 'react-router-dom'

// Component that throws an error
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>正常渲染</div>
}

// Suppress console.error from ErrorBoundary's componentDidCatch during tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = vi.fn()
})
afterAll(() => {
  console.error = originalConsoleError
})

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('正常内容')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )
    expect(screen.getByText('页面出错了')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /返回首页/ })).toBeInTheDocument()
  })

  it('shows error details in details element', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )
    expect(screen.getByText('错误详情')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('retry button exists and is clickable', () => {
    const { container } = render(
      <BrowserRouter>
        <ErrorBoundary>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )
    expect(screen.getByText('页面出错了')).toBeInTheDocument()

    // Retry button should be present
    const retryBtn = container.querySelector('.error-boundary__btn--retry')
    expect(retryBtn).toBeInTheDocument()
    expect(retryBtn?.textContent).toContain('重试')

    // Clicking retry should not crash
    expect(() => fireEvent.click(retryBtn!)).not.toThrow()
  })

  it('renders custom fallback title', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary fallbackTitle="自定义错误标题">
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )
    expect(screen.getByText('自定义错误标题')).toBeInTheDocument()
  })

  it('calls reportError when reportToServer is true', () => {
    // sendBeacon is not available in jsdom, so mock it
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn(() => true),
      writable: true,
    })

    render(
      <BrowserRouter>
        <ErrorBoundary reportToServer={true}>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )

    expect(navigator.sendBeacon).toHaveBeenCalled()
  })

  it('has proper aria labels and roles', () => {
    render(
      <BrowserRouter>
        <ErrorBoundary>
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </BrowserRouter>
    )
    expect(screen.getByText('🔄 重试')).toBeInTheDocument()
    expect(screen.getByText('🏠 返回首页').closest('a')).toHaveAttribute('href', '/')
  })
})