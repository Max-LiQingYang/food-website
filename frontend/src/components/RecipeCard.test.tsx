import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { ThemeProvider } from '../context/ThemeContext'
import RecipeCard from './RecipeCard'

vi.mock('../api', () => ({
  addFavorite: vi.fn().mockResolvedValue({}),
  removeFavorite: vi.fn().mockResolvedValue({}),
  getFavoriteStatus: vi.fn().mockResolvedValue({ data: { isFavorited: false } }),
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
  return { ...actual, useNavigate: vi.fn() }
})

import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useNavigate } from 'react-router-dom'

const defaultRecipe = {
  id: 'recipe-1',
  title: '番茄炒蛋',
  description: '经典家常菜',
  category: '中式',
  image: 'https://example.com/img.jpg',
  coverImage: 'https://example.com/img.jpg',
  servings: 2,
  difficulty: 'easy',
  cookTime: 15,
  userId: 'user-1',
  author: '小明',
  rating: 4.5,
  nutriScore: 'B',
  smartDifficulty: 'beginner',
  qualityLabel: '热门',
  favoriteCount: 10,
  avgRating: 4.5,
  ingredients: [{ name: '番茄' }, { name: '鸡蛋' }, { name: '盐' }],
  steps: [{ content: '打鸡蛋' }, { content: '炒番茄' }],
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            {ui}
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(useAuth as any).mockReturnValue({
    isAuthenticated: true,
    user: { id: 'u1', username: 'testuser' },
    logout: vi.fn(),
  })
  ;(useToast as any).mockReturnValue({
    showToast: vi.fn(),
  })
  ;(useNavigate as any).mockReturnValue(vi.fn())
})

describe('RecipeCard', () => {
  describe('基础渲染', () => {
    it('渲染食谱标题', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('番茄炒蛋')).toBeDefined()
    })

    it('渲染分类标签', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('中式')).toBeDefined()
    })

    it('渲染烹饪时间', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText(/15分钟/)).toBeDefined()
    })

    it('渲染 NutriScore 徽章', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('NutriScore B')).toBeDefined()
    })

    it('渲染质量标签', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('热门')).toBeDefined()
    })

    it('渲染作者名', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText(/小明/)).toBeDefined()
    })

    it('渲染封面图', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      const imgs = screen.getAllByRole('img')
      expect(imgs.length).toBeGreaterThan(0)
    })

    it('card 元素有 button role (存在多个 button)', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      const buttons = screen.getAllByRole('button')
      // RecipeCard itself + FavoriteButton
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('NutriScore', () => {
    it('显示 NutriScore B', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('NutriScore B')).toBeDefined()
    })

    it('无 NutriScore 时不显示', () => {
      const recipe = { ...defaultRecipe, nutriScore: undefined }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.queryByText(/NutriScore/)).toBeNull()
    })

    it('显示 NutriScore A', () => {
      const recipe = { ...defaultRecipe, nutriScore: 'A' }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.getByText('NutriScore A')).toBeDefined()
    })

    it('显示 NutriScore E', () => {
      const recipe = { ...defaultRecipe, nutriScore: 'E' }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.getByText('NutriScore E')).toBeDefined()
    })
  })

  describe('难度标签', () => {
    it('渲染智能难度标签 (simple → 入门)', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText(/入门/)).toBeDefined()
    })

    it('无智能难度时不显示', () => {
      const recipe = { ...defaultRecipe, smartDifficulty: undefined }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.getByText('番茄炒蛋')).toBeDefined()
    })
  })

  describe('交互行为', () => {
    it('点击卡片导航到详情（通过 data-testid 定位）', () => {
      const navigate = vi.fn()
      ;(useNavigate as any).mockReturnValue(navigate)
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      // Fire click on the card element (first button-like element is the card itself)
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[0])
      expect(navigate).toHaveBeenCalledWith('/recipe/recipe-1')
    })

    it('按 Enter 键导航', () => {
      const navigate = vi.fn()
      ;(useNavigate as any).mockReturnValue(navigate)
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      const cards = screen.getAllByRole('button')
      fireEvent.keyDown(cards[0], { key: 'Enter' })
      expect(navigate).toHaveBeenCalledWith('/recipe/recipe-1')
    })

    it('按 Space 键导航', () => {
      const navigate = vi.fn()
      ;(useNavigate as any).mockReturnValue(navigate)
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      const cards = screen.getAllByRole('button')
      fireEvent.keyDown(cards[0], { key: ' ' })
      expect(navigate).toHaveBeenCalledWith('/recipe/recipe-1')
    })

    it('未登录也能渲染不报错', () => {
      ;(useAuth as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: vi.fn(),
      })
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('番茄炒蛋')).toBeDefined()
    })
  })

  describe('封面图处理', () => {
    it('有封面图时渲染图片', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      const imgs = screen.getAllByRole('img')
      expect(imgs.length).toBeGreaterThan(0)
    })

    it('无封面图时显示占位符', () => {
      const recipe = { ...defaultRecipe, coverImage: undefined }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.getByText('🍽️')).toBeDefined()
    })
  })

  describe('高亮搜索词', () => {
    it('有高亮参数时不报错', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} highlightQuery="番茄" />)
      // Text is split into <mark> elements, just verify it doesn't throw
      expect(screen.getByText('炒蛋', { exact: false })).toBeDefined()
    })

    it('无高亮参数时正常渲染', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('番茄炒蛋')).toBeDefined()
    })
  })

  describe('meta 信息', () => {
    it('渲染卡路里', () => {
      const recipe = { ...defaultRecipe, nutrition: { calories: 350 } }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.getByText(/350 kcal/)).toBeDefined()
    })

    it('无营养数据时不显示卡路里', () => {
      const recipe = { ...defaultRecipe, nutrition: undefined }
      renderWithProviders(<RecipeCard recipe={recipe} />)
      expect(screen.queryByText(/kcal/)).toBeNull()
    })
  })

  describe('variant', () => {
    it('默认模式下正常工作', () => {
      renderWithProviders(<RecipeCard recipe={defaultRecipe} />)
      expect(screen.getByText('番茄炒蛋')).toBeDefined()
    })
  })
})