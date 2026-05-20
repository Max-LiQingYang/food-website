import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import FavoriteButton from './FavoriteButton'
import * as api from '../api'

// Mock API
vi.mock('../api', () => ({
  addFavorite: vi.fn().mockResolvedValue({}),
  removeFavorite: vi.fn().mockResolvedValue({}),
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

  it('未收藏时显示"收藏"', () => {
    renderButton({ isFavorited: false })
    expect(screen.getByText('收藏')).toBeInTheDocument()
  })

  it('已收藏时显示"已收藏"', () => {
    renderButton({ isFavorited: true })
    expect(screen.getByText('已收藏')).toBeInTheDocument()
  })

  it('点击已收藏按钮调用 removeFavorite', async () => {
    renderButton({ isFavorited: true })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(api.removeFavorite).toHaveBeenCalledWith('test-recipe-123')
    })
  })

  it('点击未收藏按钮调用 addFavorite', async () => {
    renderButton({ isFavorited: false })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(api.addFavorite).toHaveBeenCalledWith('test-recipe-123')
    })
  })
})
