import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Breadcrumb from './Breadcrumb'

describe('Breadcrumb', () => {
  it('returns null on homepage', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows home > favorites on /favorites', () => {
    render(
      <MemoryRouter initialEntries={['/favorites']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('首页')).toBeInTheDocument()
    expect(screen.getByText('我的收藏')).toBeInTheDocument()
  })

  it('shows home > 排行榜 on /rankings', () => {
    render(
      <MemoryRouter initialEntries={['/rankings']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('排行榜')).toBeInTheDocument()
  })

  it('shows home > 食材推荐 on /recommend', () => {
    render(
      <MemoryRouter initialEntries={['/recommend']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('食材推荐')).toBeInTheDocument()
  })

  it('shows home > 收藏夹 on /collections', () => {
    render(
      <MemoryRouter initialEntries={['/collections']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('收藏夹')).toBeInTheDocument()
  })

  it('shows home > 购物清单 on /shopping-list', () => {
    render(
      <MemoryRouter initialEntries={['/shopping-list']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('购物清单')).toBeInTheDocument()
  })

  it('shows home > 食谱详情 on /recipe/:id', () => {
    render(
      <MemoryRouter initialEntries={['/recipe/abc-123']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('食谱详情')).toBeInTheDocument()
  })

  it('shows home > 食谱详情 > 编辑 on /recipe/:id/edit', () => {
    render(
      <MemoryRouter initialEntries={['/recipe/abc-123/edit']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('编辑')).toBeInTheDocument()
  })

  it('shows home > 新建食谱 on /recipe/new', () => {
    render(
      <MemoryRouter initialEntries={['/recipe/new']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('新建食谱')).toBeInTheDocument()
  })

  it('shows home > 用户主页 on /user/:id', () => {
    render(
      <MemoryRouter initialEntries={['/user/42']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('用户主页')).toBeInTheDocument()
  })

  it('show home > 搜索 on /search', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    expect(screen.getByText('搜索')).toBeInTheDocument()
  })

  it('first segment is always a link to home', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <Breadcrumb />
      </MemoryRouter>
    )
    const homeLink = screen.getByText('首页').closest('a')
    expect(homeLink).toHaveAttribute('href', '/')
  })
})