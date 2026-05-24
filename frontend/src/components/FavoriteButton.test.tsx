import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import React from 'react'
import FavoriteButton from './FavoriteButton'
import * as api from '../api'

// Mock API
vi.mock('../api', () => ({
  addFavorite: vi.fn().mockResolvedValue({ data: {} }),
  removeFavorite: vi.fn().mockResolvedValue({ data: {} }),
  getFavoriteStatus: vi.fn().mockResolvedValue({ data: { isFavorited: false } }),
}))

// Mock Auth
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: 'fake-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const renderButton = (props = {}) => {
  return render(
    <BrowserRouter>
      <FavoriteButton recipeId="test-recipe-123" {...props} />
    </BrowserRouter>
  )
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem = vi.fn().mockReturnValue('fake-token')
  })

  it('渲染心形图标按钮', () => {
    renderButton()
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(btn.querySelector('svg')).toBeInTheDocument()
  })

  it('点击收藏调用 addFavorite', async () => {
    renderButton()
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    await waitFor(() => {
      expect(api.addFavorite).toHaveBeenCalledWith('test-recipe-123')
    })
  })
})