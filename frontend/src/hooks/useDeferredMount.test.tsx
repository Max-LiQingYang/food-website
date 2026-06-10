import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { useDeferredMount } from './useDeferredMount'

// 测试用组件
function TestComponent({ observerOptions }: { observerOptions?: IntersectionObserverInit }) {
  const { ref, shouldMount } = useDeferredMount<HTMLDivElement>(observerOptions)
  return (
    <div ref={ref} data-testid="target" style={{ height: 100 }}>
      {shouldMount ? 'MOUNTED' : 'LOADING'}
    </div>
  )
}

describe('useDeferredMount', () => {
  let mockObserve: any
  let mockDisconnect: any
  let mockCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null

  beforeEach(() => {
    mockObserve = vi.fn()
    mockDisconnect = vi.fn()
    mockCallback = null
    vi.stubGlobal('IntersectionObserver', vi.fn((cb: any) => {
      mockCallback = cb
      return { observe: mockObserve, disconnect: mockDisconnect, unobserve: vi.fn() }
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('初始状态 shouldMount 为 false', () => {
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('target').textContent).toBe('LOADING')
  })

  it('IntersectionObserver 触发后 shouldMount 变为 true', () => {
    const { getByTestId } = render(<TestComponent />)
    expect(mockObserve).toHaveBeenCalled()
    // 模拟 intersection
    act(() => {
      mockCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
    })
    expect(getByTestId('target').textContent).toBe('MOUNTED')
  })

  it('超时 fallback：3 秒后自动挂载', () => {
    vi.useFakeTimers()
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('target').textContent).toBe('LOADING')
    
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(getByTestId('target').textContent).toBe('MOUNTED')
  })

  it('observer 触发后 timeout 被清除', () => {
    vi.useFakeTimers()
    const { getByTestId } = render(<TestComponent />)
    
    act(() => {
      mockCallback?.([{ isIntersecting: true } as IntersectionObserverEntry])
    })
    expect(getByTestId('target').textContent).toBe('MOUNTED')
    
    // 推进时间不应改变状态
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(getByTestId('target').textContent).toBe('MOUNTED')
  })

  it('不支持 IntersectionObserver 时直接挂载', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('target').textContent).toBe('MOUNTED')
  })
})
