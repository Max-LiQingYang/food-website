import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MyToolsPage from '../pages/MyToolsPage'

vi.mock('../api', () => ({
  getMyTools: vi.fn(),
  removeMyTool: vi.fn(),
}))

import { getMyTools, removeMyTool } from '../api'

const mockTools = {
  list: [
    { id: '1', name: '菜刀', category: 'cutting', icon: '🔪', essential: true },
    { id: '2', name: '炒锅', category: 'cooking', icon: '🍳', essential: true },
  ],
  total: 2,
}

describe('MyToolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getMyTools as any).mockResolvedValue(mockTools)
  })

  it('显示标题和工具数量', async () => {
    render(<MemoryRouter><MyToolsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('📦 我的工具库')).toBeDefined()
      expect(screen.getByText(/共 2 个工具/)).toBeDefined()
    })
  })

  it('显示工具列表', async () => {
    render(<MemoryRouter><MyToolsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('菜刀')).toBeDefined()
      expect(screen.getByText('炒锅')).toBeDefined()
    })
  })

  it('显示必备标签', async () => {
    render(<MemoryRouter><MyToolsPage /></MemoryRouter>)
    await waitFor(() => {
      const badges = screen.getAllByText('必备')
      expect(badges.length).toBe(2)
    })
  })

  it('空状态显示提示和链接', async () => {
    ;(getMyTools as any).mockResolvedValue({ list: [], total: 0 })
    render(<MemoryRouter><MyToolsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('你还没有添加任何工具')).toBeDefined()
      const link = screen.getByText('开始添加工具')
      expect(link.getAttribute('href')).toBe('/tools')
    })
  })

  it('移除按钮触发确认和调用', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    ;(removeMyTool as any).mockResolvedValue({ message: 'ok' })
    render(<MemoryRouter><MyToolsPage /></MemoryRouter>)
    await waitFor(() => {
      const removeBtns = screen.getAllByText('✕')
      expect(removeBtns.length).toBe(2)
      fireEvent.click(removeBtns[0])
    })
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled()
      expect(removeMyTool).toHaveBeenCalledWith('1')
    })
    confirmSpy.mockRestore()
  })
})