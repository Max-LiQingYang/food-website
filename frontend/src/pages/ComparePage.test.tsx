import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ComparePage from '../pages/ComparePage'
import { compareRecipes } from '../api'

vi.mock('../api', () => ({
  compareRecipes: vi.fn(),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1, username: 'test' } }),
}))

const mockCompareResult = {
  recipes: [
    { id: 1, title: '番茄炒蛋', category: 'chinese', difficulty: 'easy', servings: 2, cookTime: '15', avgRating: 4.5, favoriteCount: 12, commentCount: 5, viewCount: 200, qualityLabel: '热门', ingredients: [{ name: '番茄', amount: 2, unit: '个' }, { name: '鸡蛋', amount: 3, unit: '个' }], nutrition: { calories: { value: 200, unit: 'kcal' }, protein: { value: 12, unit: 'g' }, carbs: { value: 8, unit: 'g' }, fat: { value: 15, unit: 'g' } } },
    { id: 2, title: '麻婆豆腐', category: 'chinese', difficulty: 'medium', servings: 3, cookTime: '20', avgRating: 4.2, favoriteCount: 8, commentCount: 3, viewCount: 150, qualityLabel: '高分', ingredients: [{ name: '豆腐', amount: 1, unit: '块' }, { name: '猪肉末', amount: 100, unit: 'g' }], nutrition: { calories: { value: 350, unit: 'kcal' }, protein: { value: 20, unit: 'g' }, carbs: { value: 10, unit: 'g' }, fat: { value: 25, unit: 'g' } } },
  ],
  summary: {
    commonIngredients: [],
    uniqueCounts: { 0: 2, 1: 2 },
    differences: { category: { values: { 0: 'chinese', 1: 'chinese' } }, difficulty: { values: { 0: 'easy', 1: 'medium' } }, servings: { values: { 0: 2, 1: 3 } } },
    recipeIngredients: [
      { uniqueCount: 2, uniqueIngredients: ['番茄', '鸡蛋'] },
      { uniqueCount: 2, uniqueIngredients: ['豆腐', '猪肉末'] },
    ],
  },
}

describe('ComparePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderPage = () => render(
    <BrowserRouter>
      <ComparePage />
    </BrowserRouter>
  )

  it('渲染输入框和对比按钮', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/例如/i)).toBeTruthy()
    expect(screen.getByText(/开始对比/i)).toBeTruthy()
  })

  it('空输入时显示提示', async () => {
    renderPage()
    const btn = screen.getByText(/开始对比/i)
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText(/请至少选择 2 个食谱/i)).toBeTruthy()
    })
  })

  it('调用 compareRecipes 并展示对比结果', async () => {
    vi.mocked(compareRecipes).mockResolvedValue(mockCompareResult)

    renderPage()
    const textarea = screen.getByPlaceholderText(/例如/i) as HTMLTextAreaElement
    const btn = screen.getByText(/开始对比/i)

    textarea.value = '1\n2'
    fireEvent.change(textarea, { target: { value: '1\n2' } })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(compareRecipes).toHaveBeenCalledWith(['1', '2'])
      expect(screen.getByText('番茄炒蛋')).toBeTruthy()
      expect(screen.getByText('麻婆豆腐')).toBeTruthy()
    })
  })

  it('展示共有食材区域', async () => {
    const resultWithCommon = {
      ...mockCompareResult,
      summary: {
        ...mockCompareResult.summary,
        commonIngredients: ['盐'],
      }
    }
    vi.mocked(compareRecipes).mockResolvedValue(resultWithCommon)

    renderPage()
    const textarea = screen.getByPlaceholderText(/例如/i) as HTMLTextAreaElement
    const btn = screen.getByText(/开始对比/i)

    textarea.value = '1\n2'
    fireEvent.change(textarea, { target: { value: '1\n2' } })
    fireEvent.click(btn)

    await waitFor(() => {
      const tags = screen.getAllByText(/盐/)
      expect(tags.length).toBeGreaterThan(0)
    })
  })

  it('API 错误时显示错误', async () => {
    vi.mocked(compareRecipes).mockRejectedValue(new Error('网络错误'))

    renderPage()
    const textarea = screen.getByPlaceholderText(/例如/i) as HTMLTextAreaElement
    const btn = screen.getByText(/开始对比/i)

    textarea.value = '1\n2'
    fireEvent.change(textarea, { target: { value: '1\n2' } })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText(/网络错误/i)).toBeTruthy()
    })
  })
})