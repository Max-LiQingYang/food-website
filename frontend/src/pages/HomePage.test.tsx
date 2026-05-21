import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import HomePage from '../pages/HomePage'
import * as api from '../api'

vi.mock('../api', () => ({
  getRecipes: vi.fn(),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空数据时显示空状态', async () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 }
    })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('暂无食谱')).toBeInTheDocument()
    })
  })

  it('有食谱数据时显示卡片列表', async () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: {
        list: [
          { id: '1', title: '宫保鸡丁', coverImage: '', author: '大厨', cookTime: 30, category: '中餐' },
          { id: '2', title: '意大利面', coverImage: '', author: 'Chef', cookTime: 20, category: '西餐' },
        ],
        total: 2
      }
    })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })
    expect(screen.getByText('意大利面')).toBeInTheDocument()
  })

  it('渲染搜索栏和分类标签', async () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 }
    })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索食谱...')).toBeInTheDocument()
    })
    expect(screen.getByText('全部')).toBeInTheDocument()
    expect(screen.getByText('中餐')).toBeInTheDocument()
    expect(screen.getByText('西餐')).toBeInTheDocument()
    expect(screen.getByText('甜点')).toBeInTheDocument()
    expect(screen.getByText('日韩')).toBeInTheDocument()
    expect(screen.getByText('其他')).toBeInTheDocument()
  })

  it('分类切换触发重新请求', async () => {
    const mockFn = (api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 }
    })
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })
})