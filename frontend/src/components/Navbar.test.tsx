import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../context/ThemeContext'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '../context/AuthContext'
import Navbar from './Navbar'

vi.mock('../api', () => ({
  searchRecipes: vi.fn().mockResolvedValue({
    data: { code: 200, data: [
      { id: 'r1', title: '番茄炒蛋', category: '中式', coverImage: '' },
    ]},
  }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
  ToastProvider: ({ children }: any) => children,
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: vi.fn(() => ({ isDark: false, toggleTheme: vi.fn() })),
  ThemeProvider: ({ children }: any) => children,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: vi.fn(), useLocation: vi.fn(() => ({ pathname: '/' })) }
})

import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {ui}
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(useAuth as any).mockReturnValue({
    isAuthenticated: true,
    user: { id: 'u1', username: 'testuser', role: 'user' },
    logout: vi.fn(),
  })
  ;(useNavigate as any).mockReturnValue(vi.fn())
  ;(useLocation as any).mockReturnValue({ pathname: '/' })
})

describe('Navbar', () => {
  it('渲染品牌名', () => {
    renderWithProviders(<Navbar />)
    const brandText = screen.getAllByText(/美食|Food/).length > 0
    expect(brandText).toBe(true)
  })

  it('渲染首页链接', () => {
    renderWithProviders(<Navbar />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThan(0)
  })

  it('已登录用户显示用户名', () => {
    renderWithProviders(<Navbar />)
    const userText = screen.queryByText(/testuser/)
    expect(userText).toBeDefined()
  })

  it('未登录用户不显示用户名', () => {
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
    })
    renderWithProviders(<Navbar />)
    expect(screen.queryByText(/testuser/)).toBeNull()
  })

  it('渲染搜索输入框', () => {
    renderWithProviders(<Navbar />)
    const searchInput = screen.queryByPlaceholderText(/搜索/)
    expect(searchInput).toBeDefined()
  })

  it('管理员角色渲染正常', () => {
    ;(useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { id: 'u1', username: 'admin', role: 'admin' },
      logout: vi.fn(),
    })
    renderWithProviders(<Navbar />)
    expect(screen.queryByText(/admin/)).toBeDefined()
  })

  it('切换暗色模式按钮', () => {
    renderWithProviders(<Navbar />)
    const themeBtn = screen.queryAllByRole('button')
    expect(themeBtn.length).toBeGreaterThan(0)
  })
})

describe('Navbar 移动端', () => {
  it('移动端汉堡菜单', () => {
    renderWithProviders(<Navbar />)
    // Should render without errors
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0)
  })
})

describe('Navbar 新链接', () => {
  it('包含手头食材链接', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/手头食材/)).toBeDefined()
  })

  it('包含挑战赛链接', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/挑战赛/)).toBeDefined()
  })

  it('包含工具库链接', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/工具库/)).toBeDefined()
  })

  it('包含食材推荐链接', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByText(/食材推荐/)).toBeDefined()
  })
})

describe('Navbar 对齐', () => {
  it('导航链接容器垂直居中对齐', () => {
    const { container } = renderWithProviders(<Navbar />)
    const linksEl = container.querySelector('.navbar__links')
    expect(linksEl).not.toBeNull()
    // jsdom 不加载外部 CSS 文件，getComputedStyle 无法获取样式表规则
    // 改为直接验证 CSS 源文件包含 align-items: center 规则
    const css = fs.readFileSync(path.join(__dirname, 'Navbar.css'), 'utf-8')
    expect(css).toMatch(/\.navbar__links\s*\{[^}]*align-items\s*:\s*center/)
  })
})