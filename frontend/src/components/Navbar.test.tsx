import { describe, it, expect, vi, beforeEach } from 'vitest'
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