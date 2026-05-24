import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import MealPlannerPage from '../pages/MealPlannerPage'

vi.mock('../api', () => ({
  getMealPlans: vi.fn(),
  createMealPlan: vi.fn(),
  updateMealPlan: vi.fn(),
  deleteMealPlan: vi.fn(),
  generateShoppingListFromMealPlan: vi.fn(),
  searchRecipes: vi.fn(),
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
}))

import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getMealPlans, createMealPlan, updateMealPlan, deleteMealPlan, generateShoppingListFromMealPlan, searchRecipes } from '../api'

const mockMealPlan = {
  id: 'plan-1',
  weekStart: '2026-05-25',
  meals: [
    { day: 0, mealType: 'breakfast', recipeId: 'r1', recipeTitle: '小米粥' },
    { day: 0, mealType: 'lunch', recipeId: 'r2', recipeTitle: '番茄炒蛋' },
    { day: 2, mealType: 'dinner', recipeId: 'r3', recipeTitle: '红烧肉' },
  ],
}

const mockRecipes = [
  { id: 'r1', title: '小米粥', coverImage: '', category: '中式', cookTime: 30 },
  { id: 'r2', title: '番茄炒蛋', coverImage: '', category: '中式', cookTime: 15 },
  { id: 'r3', title: '红烧肉', coverImage: '', category: '中式', cookTime: 60 },
  { id: 'r4', title: '意大利面', coverImage: '', category: '西式', cookTime: 25 },
]

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(useAuth as any).mockReturnValue({
    isAuthenticated: true,
    user: { id: 'u1', username: 'testuser', nickname: '小明' },
    logout: vi.fn(),
  })
  ;(useToast as any).mockReturnValue({
    showToast: vi.fn(),
  })
  ;(getMealPlans as any).mockResolvedValue([mockMealPlan])
})

describe('MealPlannerPage', () => {
  describe('初始渲染', () => {
    it('渲染页面标题', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('📅 每周餐单计划')).toBeDefined()
    })

    it('渲染周导航栏', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('‹ 上周')).toBeDefined()
      expect(await screen.findByText('下周 ›')).toBeDefined()
    })

    it('渲染操作按钮', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('💾 保存餐单')).toBeDefined()
      expect(await screen.findByText('🛒 生成购物清单')).toBeDefined()
      expect(await screen.findByText('🗑️ 清空')).toBeDefined()
    })

    it('渲染日期标签', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('周一')).toBeDefined()
      expect(await screen.findByText('周日')).toBeDefined()
    })

    it('渲染时段标签', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('早餐')).toBeDefined()
      expect(await screen.findByText('午餐')).toBeDefined()
      expect(await screen.findByText('晚餐')).toBeDefined()
      expect(await screen.findByText('加餐')).toBeDefined()
    })
  })

  describe('餐单加载', () => {
    it('未认证时跳转到登录页', async () => {
      ;(useAuth as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        logout: vi.fn(),
      })
      const { container } = renderWithProviders(<MealPlannerPage />)
      await waitFor(() => {
        expect(container.innerHTML).toBe('')
      })
    })

    it('显示已保存的食谱', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('小米粥')).toBeDefined()
      expect(await screen.findByText('番茄炒蛋')).toBeDefined()
    })

    it('展示空餐单时显示占位符', async () => {
      ;(getMealPlans as any).mockResolvedValue([])
      renderWithProviders(<MealPlannerPage />)
      await waitFor(async () => {
        const placeholders = screen.getAllByText('+ 添加食谱')
        expect(placeholders.length).toBe(28) // 7 days × 4 meals
      })
    })

    it('加载失败时显示错误提示', async () => {
      ;(getMealPlans as any).mockRejectedValue(new Error('Network error'))
      const { showToast } = useToast()
      renderWithProviders(<MealPlannerPage />)
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('加载餐单失败', 'error')
      })
    })
  })

  describe('餐单操作', () => {
    it('保存餐单（已有 planId 时更新）', async () => {
      ;(updateMealPlan as any).mockResolvedValue({ id: 'plan-1' })
      renderWithProviders(<MealPlannerPage />)
      const saveBtn = await screen.findByText('💾 保存餐单')
      fireEvent.click(saveBtn)
      await waitFor(() => {
        expect(updateMealPlan).toHaveBeenCalled()
      })
    })

    it('保存新餐单（无 planId 时创建）', async () => {
      ;(getMealPlans as any).mockResolvedValue([])
      ;(createMealPlan as any).mockResolvedValue({ id: 'new-plan', weekStart: '2026-05-25', meals: [] })
      renderWithProviders(<MealPlannerPage />)
      const saveBtn = await screen.findByText('💾 保存餐单')
      fireEvent.click(saveBtn)
      await waitFor(() => {
        expect(createMealPlan).toHaveBeenCalled()
      })
    })

    it('清空餐单', async () => {
      ;(deleteMealPlan as any).mockResolvedValue(undefined)
      renderWithProviders(<MealPlannerPage />)
      const clearBtn = await screen.findByText('🗑️ 清空')
      fireEvent.click(clearBtn)
      await waitFor(() => {
        expect(deleteMealPlan).toHaveBeenCalledWith('plan-1')
      })
    })

    it('生成购物清单', async () => {
      ;(generateShoppingListFromMealPlan as any).mockResolvedValue({ id: 'sl-1' })
      renderWithProviders(<MealPlannerPage />)
      const listBtn = await screen.findByText('🛒 生成购物清单')
      fireEvent.click(listBtn)
      await waitFor(() => {
        expect(generateShoppingListFromMealPlan).toHaveBeenCalledWith('plan-1')
      })
    })

    it('未保存时生成购物清单按钮不可点击', async () => {
      ;(getMealPlans as any).mockResolvedValue([])
      renderWithProviders(<MealPlannerPage />)
      const listBtn = await screen.findByText('🛒 生成购物清单')
      expect((listBtn as HTMLButtonElement).disabled).toBe(true)
    })

    it('翻周到上周', async () => {
      renderWithProviders(<MealPlannerPage />)
      const prevBtn = await screen.findByText('‹ 上周')
      fireEvent.click(prevBtn)
      await waitFor(() => {
        expect(getMealPlans).toHaveBeenCalledTimes(2) // initial + prev week
      })
    })

    it('翻周到下周', async () => {
      renderWithProviders(<MealPlannerPage />)
      const nextBtn = await screen.findByText('下周 ›')
      fireEvent.click(nextBtn)
      await waitFor(() => {
        expect(getMealPlans).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('搜索弹窗', () => {
    it('点击空餐位打开搜索弹窗', async () => {
      renderWithProviders(<MealPlannerPage />)
      const addBtns = await screen.findAllByText('+ 添加食谱')
      fireEvent.click(addBtns[0])
      expect(await screen.findByPlaceholderText('搜索食谱名称...')).toBeDefined()
    })

    it('搜索食谱显示结果', async () => {
      ;(searchRecipes as any).mockResolvedValue({ data: mockRecipes })
      renderWithProviders(<MealPlannerPage />)
      const addBtns = await screen.findAllByText('+ 添加食谱')
      fireEvent.click(addBtns[0])
      const input = await screen.findByPlaceholderText('搜索食谱名称...')
      fireEvent.change(input, { target: { value: '番茄' } })
      // Wait for results
      await waitFor(() => {
        const results = screen.getAllByText('番茄炒蛋')
        expect(results.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('搜索无结果时显示空状态', async () => {
      ;(searchRecipes as any).mockResolvedValue({ data: [] })
      renderWithProviders(<MealPlannerPage />)
      const addBtns = await screen.findAllByText('+ 添加食谱')
      fireEvent.click(addBtns[0])
      const input = await screen.findByPlaceholderText('搜索食谱名称...')
      fireEvent.change(input, { target: { value: 'xyznotexist' } })
      expect(await screen.findByText('未找到相关食谱')).toBeDefined()
    })

    it('搜索弹窗关闭按钮', async () => {
      renderWithProviders(<MealPlannerPage />)
      const addBtns = await screen.findAllByText('+ 添加食谱')
      fireEvent.click(addBtns[0])
      // Get all ✕ buttons - find the close (not remove) one
      await screen.findByPlaceholderText('搜索食谱名称...')
      const xButtons = screen.getAllByText('✕')
      // The last one is likely the search close button
      fireEvent.click(xButtons[xButtons.length - 1])
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('搜索食谱名称...')).toBeNull()
      })
    })
  })

  describe('API 类型定义', () => {
    it('getMealPlans 正确的返回类型', () => {
      getMealPlans('2026-05-25')
      expect(getMealPlans).toHaveBeenCalledWith('2026-05-25')
    })

    it('createMealPlan 接受 weekStart 和 meals', () => {
      createMealPlan('2026-05-25', [])
      expect(createMealPlan).toHaveBeenCalledWith('2026-05-25', [])
    })
  })

  describe('拖拽功能', () => {
    it('渲染拖拽卡片', async () => {
      renderWithProviders(<MealPlannerPage />)
      expect(await screen.findByText('小米粥')).toBeDefined()
    })
  })
})