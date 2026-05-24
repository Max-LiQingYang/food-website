import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KitchenToolsPage from '../pages/KitchenToolsPage'

vi.mock('../api', () => ({
  getKitchenTools: vi.fn(),
  addMyTool: vi.fn(),
}))

import { getKitchenTools, addMyTool } from '../api'

const mockTools = {
  list: [
    { id: '1', name: '菜刀', category: 'cutting', icon: '🔪', description: '必备切割工具', essential: true },
    { id: '2', name: '炒锅', category: 'cooking', icon: '🍳', description: '炒菜必备', essential: true },
    { id: '3', name: '量杯', category: 'measuring', icon: '🥛', description: '', essential: false },
  ],
  total: 3,
}

describe('KitchenToolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getKitchenTools as any).mockResolvedValue(mockTools)
  })

  it('显示标题', () => {
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    expect(screen.getByText('🔪 厨房工具大全')).toBeDefined()
  })

  it('加载工具列表', async () => {
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('菜刀')).toBeDefined()
      expect(screen.getByText('炒锅')).toBeDefined()
      expect(screen.getByText('量杯')).toBeDefined()
    })
  })

  it('显示必备标签', async () => {
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    await waitFor(() => {
      const badges = screen.getAllByText('必备')
      expect(badges.length).toBe(2)
    })
  })

  it('按分类筛选', async () => {
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    await waitFor(() => {
      const cutBtns = screen.getAllByText('切割工具')
      expect(cutBtns.length).toBeGreaterThan(0)
    })
    const cutBtns = screen.getAllByText('切割工具')
    fireEvent.click(cutBtns[0])
    expect(getKitchenTools).toHaveBeenCalledWith({ category: 'cutting' })
  })

  it('添加工具按钮可点击', async () => {
    ;(addMyTool as any).mockResolvedValue({ message: 'ok' })
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    await waitFor(() => {
      const addBtns = screen.getAllByText('+ 添加')
      expect(addBtns.length).toBeGreaterThan(0)
      fireEvent.click(addBtns[0])
    })
    await waitFor(() => {
      expect(addMyTool).toHaveBeenCalledWith('1')
    })
  })

  it('空状态显示', async () => {
    ;(getKitchenTools as any).mockResolvedValue({ list: [], total: 0 })
    render(<MemoryRouter><KitchenToolsPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('暂无工具数据')).toBeDefined()
    })
  })
})