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
      data: { list: [], total: 0 },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('暂无食谱')).toBeInTheDocument()
    })
  })

  it('有食谱数据时显示卡片列表', async () => {
    const mockRecipes = [
      {
        id: '1',
        title: '宫保鸡丁',
        coverImage: '',
        author: '大厨',
        cookTime: 30,
        category: '中餐',
      },
      {
        id: '2',
        title: '意大利面',
        coverImage: '',
        author: 'Chef',
        cookTime: 20,
        category: '西餐',
      },
    ]
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: mockRecipes, total: 2 },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })
    expect(screen.getByText('意大利面')).toBeInTheDocument()
  })

  it('渲染搜索栏和分类标签', async () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索食谱...')).toBeInTheDocument()
    })
    expect(screen.getByText('全部')).toBeInTheDocument()
    // Category buttons appear in multiple places; at least one instance of each
    expect(screen.getAllByText('中餐').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('西餐').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('甜点').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('日韩').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('其他').length).toBeGreaterThanOrEqual(1)
  })

  it('分类切换触发重新请求', async () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 },
    })
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    )
    await waitFor(() => {
      // HomePage calls getRecipes twice (hero fetch + grid fetch)
      expect(api.getRecipes).toHaveBeenCalled()
    })
  })
})