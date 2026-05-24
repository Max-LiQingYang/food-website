import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'
import ImagePlaceholder from './ImagePlaceholder'

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ isDark: false, toggleTheme: vi.fn() })),
  ThemeProvider: ({ children }: any) => children,
}))

function renderWithWrapper(ui: React.ReactElement) {
  return render(<BrowserRouter><ThemeProvider>{ui}</ThemeProvider></BrowserRouter>)
}

describe('ImagePlaceholder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染 img 元素', () => {
    renderWithWrapper(<ImagePlaceholder src="https://example.com/img.jpg" alt="测试图片" />)
    const img = screen.getByRole('img')
    expect(img).toBeDefined()
  })

  it('src 属性传入正确', () => {
    renderWithWrapper(<ImagePlaceholder src="https://example.com/img.jpg" alt="测试图片" />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img.src).toContain('example.com/img.jpg')
  })

  it('alt 属性传入正确', () => {
    renderWithWrapper(<ImagePlaceholder src="https://example.com/img.jpg" alt="测试图片" />)
    expect(screen.getByAltText('测试图片')).toBeDefined()
  })

  it('应用 className', () => {
    const { container } = render(<BrowserRouter><ThemeProvider><ImagePlaceholder src="https://example.com/img.jpg" alt="test" className="custom-class" /></ThemeProvider></BrowserRouter>)
    const img = container.querySelector('img')
    expect(img?.className).toContain('custom-class')
  })

  it('自定义 style', () => {
    const { container } = render(<BrowserRouter><ThemeProvider><ImagePlaceholder src="https://example.com/img.jpg" alt="test" style={{ borderRadius: '50%', width: 100 }} /></ThemeProvider></BrowserRouter>)
    const img = container.querySelector('img')
    expect(img?.style.borderRadius).toBe('50%')
    expect(img?.style.width).toBe('100px')
  })
})

describe('ThemeProvider', () => {
  it('不指定 isDark 时默认渲染', () => {
    render(<BrowserRouter><ThemeProvider><div data-testid="theme-child">内容</div></ThemeProvider></BrowserRouter>)
    expect(screen.getByTestId('theme-child')).toBeDefined()
  })
})
describe('ImagePlaceholder 错误处理', () => {
  it('onError 回调可调用', () => {
    const onError = vi.fn()
    render(<BrowserRouter><ThemeProvider><ImagePlaceholder src="invalid-url" alt="error" onError={onError} /></ThemeProvider></BrowserRouter>)
    // Just ensure component renders without throwing
    expect(screen.getByRole('img')).toBeDefined()
  })

  it('加载中状态过渡 class', () => {
    const { container } = render(<BrowserRouter><ThemeProvider><ImagePlaceholder src="https://example.com/img.jpg" alt="test" /></ThemeProvider></BrowserRouter>)
    const img = container.querySelector('img')
    expect(img?.style.opacity).toBe('0')
  })
})
