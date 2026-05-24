import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import StepTimer from '../components/StepTimer'

describe('StepTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when no time description', () => {
    const { container } = render(<StepTimer stepNumber={1} stepContent="把鸡蛋打散" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders timer when step contains 分钟', () => {
    render(<StepTimer stepNumber={2} stepContent="煮30分钟，直到面条变软" />)
    expect(screen.getByText('30:00')).toBeInTheDocument()
    expect(screen.getByText(/开始/)).toBeInTheDocument()
  })

  it('renders timer with hours and minutes', () => {
    render(<StepTimer stepNumber={3} stepContent="小火慢炖1小时30分钟" />)
    expect(screen.getByText('1:30:00')).toBeInTheDocument()
  })

  it('renders timer with seconds', () => {
    render(<StepTimer stepNumber={4} stepContent="微波炉加热30秒" />)
    expect(screen.getByText('0:30')).toBeInTheDocument()
  })

  it('shows pause after clicking start', () => {
    render(<StepTimer stepNumber={1} stepContent="蒸20分钟" />)
    fireEvent.click(screen.getByText(/开始/))
    expect(screen.getByText(/暂停/)).toBeInTheDocument()
  })

  it('counts down correctly', () => {
    render(<StepTimer stepNumber={1} stepContent="煮5分钟" />)
    expect(screen.getByText('5:00')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/开始/))
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('4:57')).toBeInTheDocument()
  })

  it('shows done state when timer reaches zero', () => {
    render(<StepTimer stepNumber={1} stepContent="煮2分钟" />)
    fireEvent.click(screen.getByText(/开始/))
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(screen.getByText(/完成/)).toBeInTheDocument()
  })

  it('supports pause and resume', () => {
    render(<StepTimer stepNumber={1} stepContent="煮10分钟" />)
    fireEvent.click(screen.getByText(/开始/))
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    const pauseBtn = screen.getByText(/暂停/)
    fireEvent.click(pauseBtn)
    const timeAtPause = screen.getByText('9:50')
    expect(timeAtPause).toBeInTheDocument()
    // 再等几秒，应该不变
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('9:50')).toBeInTheDocument()
  })

  it('supports reset after start', () => {
    render(<StepTimer stepNumber={1} stepContent="腌15分钟" />)
    fireEvent.click(screen.getByText(/开始/))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    // remaining (14:00) < seconds (15:00), so reset button should show
    const resetBtn = screen.getByText(/重置/)
    fireEvent.click(resetBtn)
    expect(screen.getByText('15:00')).toBeInTheDocument()
    expect(screen.queryByText(/暂停/)).not.toBeInTheDocument()
  })

  it('has aria-label with timer info', () => {
    render(<StepTimer stepNumber={2} stepContent="烤30分钟" />)
    const timer = screen.getByRole('timer')
    expect(timer).toHaveAttribute('aria-label', expect.stringContaining('步骤 2'))
    expect(timer).toHaveAttribute('aria-label', expect.stringContaining('30:00'))
  })

  it('resets when step content changes', () => {
    const { rerender } = render(<StepTimer stepNumber={1} stepContent="煮10分钟" />)
    fireEvent.click(screen.getByText(/开始/))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    rerender(<StepTimer stepNumber={1} stepContent="煮20分钟" />)
    expect(screen.getByText('20:00')).toBeInTheDocument()
  })
})