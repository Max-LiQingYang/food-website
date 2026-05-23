/**
 * pages/NotFoundPage.test.tsx
 * 404 页面测试
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import NotFoundPage from '../pages/NotFoundPage'
import * as api from '../api'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../api', () => ({
  getRecipes: vi.fn(),
}))

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  )

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('显示 404 标题和返回按钮', () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 },
    })
    renderWithProviders(<NotFoundPage />)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('哎呀，页面不见了')).toBeInTheDocument()
    expect(screen.getByText(/返回上一页/)).toBeInTheDocument()
    expect(screen.getByText(/回到首页/)).toBeInTheDocument()
  })

  it('加载热门食谱推荐时显示骨架屏', () => {
    ;(api.getRecipes as any).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<NotFoundPage />)

    // 加载中应显示骨架屏标题
    expect(screen.getByText(/这些食谱可能感兴趣/)).toBeInTheDocument()
  })

  it('API 失败时静默降级（只显示 404 内容）', async () => {
    ;(api.getRecipes as any).mockRejectedValue(new Error('网络错误'))
    renderWithProviders(<NotFoundPage />)

    await waitFor(() => {
      expect(screen.getByText('哎呀，页面不见了')).toBeInTheDocument()
      expect(screen.queryByText(/这些食谱可能感兴趣/)).not.toBeInTheDocument()
    })
  })

  it('有推荐食谱时显示卡片网格', async () => {
    const mockRecipes = [
      { id: '1', title: '宫保鸡丁', category: '川菜', coverImage: '', favoriteCount: 10 },
      { id: '2', title: '麻婆豆腐', category: '川菜', coverImage: '', favoriteCount: 8 },
    ]
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: mockRecipes, total: 2 },
    })
    renderWithProviders(<NotFoundPage />)

    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
      expect(screen.getByText('麻婆豆腐')).toBeInTheDocument()
    })
  })

  it('包含返回首页链接', () => {
    ;(api.getRecipes as any).mockResolvedValue({
      data: { list: [], total: 0 },
    })
    renderWithProviders(<NotFoundPage />)

    const homeLink = screen.getByText('🏠 回到首页').closest('a')
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})