import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import FavoriteList from '../pages/FavoriteList'
import * as api from '../api'

vi.mock('../api', () => ({
  getFavoriteList: vi.fn(),
  removeFavorite: vi.fn().mockResolvedValue({}),
}))

describe('FavoriteList', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('空列表显示空状态文案', async () => {
    ;(api.getFavoriteList as any).mockResolvedValue({
      data: { list: [], total: 0 }
    })
    render(<BrowserRouter><FavoriteList /></BrowserRouter>)
    await waitFor(() => {
      expect(screen.getByText('还没有收藏任何食谱')).toBeInTheDocument()
    })
  })

  it('有收藏数据时显示列表', async () => {
    ;(api.getFavoriteList as any).mockResolvedValue({
      data: {
        list: [{
          id: 1,
          userId: 'u1',
          recipeId: 'r1',
          createdAt: '2026-01-01',
          recipe: { id: 'r1', title: '宫保鸡丁', coverImage: '', author: '大厨', cookTime: 30 }
        }],
        total: 1
      }
    })
    render(<BrowserRouter><FavoriteList /></BrowserRouter>)
    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })
    expect(screen.getByText('共 1 个食谱')).toBeInTheDocument()
  })
})
