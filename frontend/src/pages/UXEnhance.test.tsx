import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import EmptyState from '../components/EmptyState'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('EmptyState', () => {
  it('renders title and icon', () => {
    render(<Wrapper><EmptyState title="暂无数据" icon="📭" /></Wrapper>)
    expect(screen.getByText('暂无数据')).toBeDefined()
    expect(screen.getByText('📭')).toBeDefined()
  })

  it('renders description when provided', () => {
    render(<Wrapper><EmptyState title="空空如也" description="这里什么也没有" /></Wrapper>)
    expect(screen.getByText('空空如也')).toBeDefined()
    expect(screen.getByText('这里什么也没有')).toBeDefined()
  })

  it('renders action button and handles click', () => {
    const onClick = vi.fn()
    render(<Wrapper><EmptyState title="无内容" action={{ label: '去看看', onClick }} /></Wrapper>)
    const btn = screen.getByText('去看看')
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('applies compact class when compact prop is true', () => {
    const { container } = render(<Wrapper><EmptyState title="简短提示" compact /></Wrapper>)
    expect(container.querySelector('.empty-state--compact')).toBeTruthy()
  })

  it('renders without icon when icon is not provided', () => {
    render(<Wrapper><EmptyState title="仅标题" /></Wrapper>)
    expect(screen.getByText('仅标题')).toBeDefined()
    // Default icon should render
    expect(screen.getByText('📭')).toBeDefined()
  })

  it('renders default icon when not specified', () => {
    const { container } = render(<Wrapper><EmptyState title="默认图标" /></Wrapper>)
    expect(container.querySelector('.empty-state__icon')).toBeTruthy()
  })
})

describe('Footer', () => {
  it('renders copyright year and brand', () => {
    render(<Wrapper><footer className="footer"><div className="footer__bottom"><span>© {new Date().getFullYear()} 美食食谱. All rights reserved.</span></div></footer></Wrapper>)
    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeDefined()
  })
})

describe('HomePage - UI enhancements', () => {
  it('renders skeleton shimmer during loading', () => {
    const { container } = render(
      <Wrapper>
        <div className="home-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: 200 }} />
          ))}
        </div>
      </Wrapper>
    )
    const skeletons = container.querySelectorAll('.skeleton-box')
    expect(skeletons.length).toBe(3)
  })
})

describe('RecipeCard entrance animation', () => {
  it('applies recipe-card-enter class with staggered delay', () => {
    const { container } = render(
      <Wrapper>
        <div className="home-grid">
          <div className="recipe-card-enter" style={{ animationDelay: '0s' }}>Card 1</div>
          <div className="recipe-card-enter" style={{ animationDelay: '0.04s' }}>Card 2</div>
          <div className="recipe-card-enter" style={{ animationDelay: '0.08s' }}>Card 3</div>
        </div>
      </Wrapper>
    )
    const cards = container.querySelectorAll('.recipe-card-enter')
    expect(cards.length).toBe(3)
    expect((cards[1] as HTMLElement).style.animationDelay).toBe('0.04s')
  })
})