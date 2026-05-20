import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../pages/HomePage'

describe('HomePage', () => {
  it('渲染首页标题', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText('🍳 美食食谱首页')).toBeInTheDocument()
  })

  it('渲染"我的收藏"链接', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    const link = screen.getByText('→ 我的收藏')
    expect(link).toHaveAttribute('href', '/favorites')
  })
})
