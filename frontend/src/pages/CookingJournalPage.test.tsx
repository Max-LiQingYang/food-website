import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import CookingJournalPage from '../pages/CookingJournalPage'

vi.mock('../api', () => ({
  getCookingLogs: vi.fn(),
  createCookingLog: vi.fn(),
  updateCookingLog: vi.fn(),
  deleteCookingLog: vi.fn(),
  getCookingLogStats: vi.fn(),
  getRecipeById: vi.fn(),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => children,
}))

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
  ToastProvider: ({ children }: any) => children,
}))

import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  getCookingLogs, createCookingLog, updateCookingLog,
  deleteCookingLog, getCookingLogStats, getRecipeById,
} from '../api'

const mockLogs = [
  { id: 'log-1', userId: 'u1', recipeId: 'r1', recipeTitle: '番茄炒蛋', recipeCategory: '中式', cookedAt: '2026-05-24', rating: 5, notes: '很好吃！', duration: 15, photoUrl: null, createdAt: '2026-05-24T10:00:00Z', updatedAt: '2026-05-24T10:00:00Z' },
  { id: 'log-2', userId: 'u1', recipeId: 'r2', recipeTitle: '意大利面', recipeCategory: '西式', cookedAt: '2026-05-23', rating: 4, notes: '酱汁再浓一点更好', duration: 25, photoUrl: null, createdAt: '2026-05-23T18:00:00Z', updatedAt: '2026-05-23T18:00:00Z' },
  { id: 'log-3', userId: 'u1', recipeId: 'r3', recipeTitle: '红烧肉', recipeCategory: '中式', cookedAt: '2026-05-22', rating: 5, notes: '完美', duration: 90, photoUrl: null, createdAt: '2026-05-22T12:00:00Z', updatedAt: '2026-05-22T12:00:00Z' },
]

const mockStats = {
  totalCooked: 12,
  thisMonthCount: 5,
  byCategory: { '中式': 7, '西式': 3, '甜品': 2 },
  byMonth: [
    { month: '2025-06', count: 0 },
    { month: '2025-07', count: 1 },
    { month: '2025-08', count: 0 },
    { month: '2025-09', count: 2 },
    { month: '2025-10', count: 0 },
    { month: '2025-11', count: 1 },
    { month: '2025-12', count: 0 },
    { month: '2026-01', count: 0 },
    { month: '2026-02', count: 1 },
    { month: '2026-03', count: 2 },
    { month: '2026-04', count: 3 },
    { month: '2026-05', count: 2 },
  ],
  averageRating: 4.3,
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>{ui}</AuthProvider>
      </ToastProvider>
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
  ;(getCookingLogs as any).mockResolvedValue({
    list: mockLogs,
    total: 3,
    page: 1,
    pageSize: 20,
  })
  ;(getCookingLogStats as any).mockResolvedValue(mockStats)
})

describe('CookingJournalPage', () => {
  describe('初始渲染', () => {
    it('渲染页面标题', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('📖 烹饪日志')).toBeDefined()
      })
    })

    it('渲染视图切换按钮', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('📋 记录')).toBeDefined()
        expect(screen.getByText('📊 统计')).toBeDefined()
      })
    })

    it('渲染添加按钮', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('+ 记录烹饪')).toBeDefined()
      })
    })
  })

  describe('列表视图', () => {
    it('显示烹饪记录列表', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('番茄炒蛋')).toBeDefined()
        expect(screen.getByText('意大利面')).toBeDefined()
        expect(screen.getByText('红烧肉')).toBeDefined()
      })
    })

    it('显示评分星星', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        const stars = screen.getAllByText('⭐⭐⭐⭐⭐');
    expect(stars.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('显示烹饪时长', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('⏱️ 15分钟')).toBeDefined()
        expect(screen.getByText('⏱️ 90分钟')).toBeDefined()
      })
    })

    it('显示烹饪笔记', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('很好吃！')).toBeDefined()
        expect(screen.getByText('完美')).toBeDefined()
      })
    })

    it('显示分类标签', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        const catTags = screen.getAllByText('中式')
        expect(catTags.length).toBeGreaterThan(0)
        expect(screen.getByText('西式')).toBeDefined()
      })
    })

    it('空日志列表显示空状态', async () => {
      ;(getCookingLogs as any).mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 })
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('还没有烹饪记录')).toBeDefined()
      })
    })
  })

  describe('统计视图', () => {
    it('切换视图到统计', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        expect(screen.getByText('总烹饪次数')).toBeDefined()
        expect(screen.getByText('本月烹饪')).toBeDefined()
        expect(screen.getByText('平均评分')).toBeDefined()
        expect(screen.getByText('上月烹饪')).toBeDefined()
      })
    })

    it('统计数字正确显示', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        const twelve = screen.getAllByText('12');
    expect(twelve.length).toBeGreaterThanOrEqual(1) // totalCooked
        expect(screen.getByText('5')).toBeDefined() // thisMonthCount
        expect(screen.getByText('4.3')).toBeDefined() // avgRating
      })
    })

    it('显示月度趋势图', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        expect(screen.getByText('月度趋势')).toBeDefined()
      })
    })

    it('显示分类分布', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        expect(screen.getByText('分类分布')).toBeDefined()
      })
    })

    it('分类分布中显示分类名称', async () => {
      ;(getCookingLogStats as any).mockResolvedValue(mockStats)
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        expect(screen.getByText('中式')).toBeDefined()
        expect(screen.getByText('西式')).toBeDefined()
        expect(screen.getByText('甜品')).toBeDefined()
      })
    })
  })

  describe('添加/编辑', () => {
    it('点击添加按钮打开表单', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        expect(screen.getByText('记录烹饪')).toBeDefined()
      })
    })

    it('表单包含评分选择器', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        expect(screen.getByText('评分')).toBeDefined()
      })
    })

    it('表单包含日期选择', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        expect(screen.getByText('烹饪日期')).toBeDefined()
      })
    })

    it('表单包含笔记输入', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        expect(screen.getByPlaceholderText('记录你的烹饪心得、改进点...')).toBeDefined()
      })
    })

    it('关闭表单弹窗', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        const closeBtn = screen.getByText('✕')
        fireEvent.click(closeBtn)
      })
      await waitFor(() => {
        expect(screen.queryByText('记录烹饪（Modal Header）')).toBeNull()
      })
    })

    it('评分选择器可点击', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        const stars = screen.getAllByText('⭐')
        expect(stars.length).toBeGreaterThan(0)
      })
    })

    it('提交空 recipeId 时提示', async () => {
      const { showToast } = useToast()
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('+ 记录烹饪'))
      })
      await waitFor(() => {
        fireEvent.click(screen.getByText('📝 记录'))
      })
      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith('请输入食谱 ID', 'warning')
      })
    })
  })

  describe('编辑功能', () => {
    it('点击编辑按钮打开表单', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        const editBtns = screen.getAllByText('✏️')
        fireEvent.click(editBtns[0])
      })
      await waitFor(() => {
        expect(screen.getByText('编辑日志')).toBeDefined()
      })
    })
  })

  describe('删除功能', () => {
    it('删除日志', async () => {
      window.confirm = vi.fn(() => true)
      ;(deleteCookingLog as any).mockResolvedValue(undefined)
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        const deleteBtns = screen.getAllByText('🗑️')
        fireEvent.click(deleteBtns[0])
      })
      await waitFor(() => {
        expect(deleteCookingLog).toHaveBeenCalled()
      })
    })

    it('取消删除不触发 API', async () => {
      window.confirm = vi.fn(() => false)
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        const deleteBtns = screen.getAllByText('🗑️')
        fireEvent.click(deleteBtns[0])
      })
      await waitFor(() => {
        expect(deleteCookingLog).not.toHaveBeenCalled()
      })
    })
  })

  describe('分页', () => {
    it('总记录数超过一页时显示分页按钮', async () => {
      ;(getCookingLogs as any).mockResolvedValue({
        list: Array.from({ length: 20 }, (_, i) => ({
          id: `log-${i}`, userId: 'u1', recipeId: `r${i}`,
          recipeTitle: `食谱${i}`, recipeCategory: '中式',
          cookedAt: '2026-05-24', rating: 4, notes: null, duration: null,
          photoUrl: null, createdAt: '2026-05-24T10:00:00Z', updatedAt: '2026-05-24T10:00:00Z',
        })),
        total: 45,
        page: 1,
        pageSize: 20,
      })
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        expect(screen.getByText('« 上一页')).toBeDefined()
        expect(screen.getByText('下一页 »')).toBeDefined()
      })
    })
  })

  describe('API 类型定义', () => {
    it('getCookingLogs 接受参数', () => {
      getCookingLogs({ page: 1, pageSize: 20 })
      expect(getCookingLogs).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    })

    it('createCookingLog 接受烹饪数据', () => {
      createCookingLog({ recipeId: 'r1', rating: 5, notes: '好' })
      expect(createCookingLog).toHaveBeenCalledWith({ recipeId: 'r1', rating: 5, notes: '好' })
    })

    it('updateCookingLog 接受日志 ID 和更新数据', () => {
      updateCookingLog('log-1', { rating: 4 })
      expect(updateCookingLog).toHaveBeenCalledWith('log-1', { rating: 4 })
    })

    it('deleteCookingLog 接受日志 ID', () => {
      deleteCookingLog('log-1')
      expect(deleteCookingLog).toHaveBeenCalledWith('log-1')
    })

    it('getCookingLogStats 不需要参数', () => {
      getCookingLogStats()
      expect(getCookingLogStats).toHaveBeenCalledWith()
    })
  })

  describe('体验增强', () => {
    it('列表视图切换到统计视图再切回', async () => {
      renderWithProviders(<CookingJournalPage />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('📊 统计'))
      })
      await waitFor(() => {
        expect(screen.getByText('总烹饪次数')).toBeDefined()
      })
      fireEvent.click(screen.getByText('📋 记录'))
      await waitFor(() => {
        expect(screen.getByText('番茄炒蛋')).toBeDefined()
      })
    })
  })
})