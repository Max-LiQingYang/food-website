import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import RecipeDetailPage from '../pages/RecipeDetailPage'
import * as api from '../api'
import React from 'react'

// ── Mock API ──────────────────────────────────────────────────────────────────
vi.mock('../api', () => ({
  getRecipeById: vi.fn(),
  getRecipes: vi.fn().mockResolvedValue({ data: { list: [], total: 0 } }),
  getFavoriteStatus: vi.fn().mockResolvedValue({ data: { isFavorited: false } }),
  addFavorite: vi.fn().mockResolvedValue({ data: {} }),
  removeFavorite: vi.fn().mockResolvedValue({ data: {} }),
  deleteRecipe: vi.fn().mockResolvedValue({}),
}))

// ── Mock Toast ────────────────────────────────────────────────────────────────
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

vi.mock('../context/ToastContext', () => ({
  useToast: () => mockToast,
}))

// ── Mock Auth ─────────────────────────────────────────────────────────────────
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

// ── Mock comment section ──────────────────────────────────────────────────────
vi.mock('../components/CommentSection', () => ({
  default: ({ recipeId }: { recipeId: string }) =>
    React.createElement('div', { 'data-testid': 'comment-section' }, `Comments for ${recipeId}`),
}))

// ── Test helpers ──────────────────────────────────────────────────────────────
const mockRecipe = {
  id: '1a2b3c',
  title: '宫保鸡丁',
  coverImage: 'https://example.com/gongbao.jpg',
  author: '家常美食',
  cookTime: 25,
  description: '经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香。',
  category: 'chinese',
  difficulty: 'medium',
  servings: 3,
  userId: null,
  ingredients: [
    { name: '鸡胸肉', amount: 300, unit: 'g' },
    { name: '花生米', amount: 50, unit: 'g' },
    { name: '干辣椒', amount: 10, unit: '个' },
    { name: '葱姜蒜', amount: 15, unit: 'g' },
  ],
  steps: [
    { stepNumber: 1, content: '鸡胸肉切丁，用料酒、生抽、淀粉腌制15分钟' },
    { stepNumber: 2, content: '花生米小火炒至金黄盛出备用' },
    { stepNumber: 3, content: '热锅冷油，下鸡丁滑炒至变色盛出' },
    { stepNumber: 4, content: '锅中留底油，爆香干辣椒、花椒、葱姜蒜' },
    { stepNumber: 5, content: '倒入鸡丁和花生米翻炒，淋入调好的酱汁' },
    { stepNumber: 6, content: '大火收汁，撒上葱花出锅' },
  ],
  categoryTags: {
    ingredient: '肉类',
    method: '炒',
    cuisine: '川菜',
    flavor: '麻辣',
    price: '普通家常',
  },
  createdAt: '2026-01-01',
}

function renderDetail(id = '1a2b3c') {
  return render(
    <MemoryRouter initialEntries={[`/recipe/${id}`]}>
      <Routes>
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('加载时显示骨架屏', () => {
    // Don't resolve the promise, keep loading
    ;(api.getRecipeById as any).mockReturnValue(new Promise(() => {}))
    renderDetail()
    expect(document.querySelector('.detail-skeleton')).toBeInTheDocument()
  })

  it('食谱不存在时显示404页面', async () => {
    ;(api.getRecipeById as any).mockRejectedValue(new Error('Not found'))
    ;(api.getFavoriteStatus as any).mockRejectedValue(new Error('Not found'))

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('食谱不存在')).toBeInTheDocument()
    })
    expect(screen.getByText('返回首页')).toBeInTheDocument()
  })

  it('正常渲染食谱详情所有数据', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      // Title
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })

    // Author
    expect(screen.getByText(/家常美食/)).toBeInTheDocument()

    // Description
    expect(screen.getByText('经典川菜，鸡肉嫩滑，花生酥脆，麻辣鲜香。')).toBeInTheDocument()

    // Meta tags
    expect(screen.getByText('中餐')).toBeInTheDocument()
    expect(screen.getByText('中等')).toBeInTheDocument()
    expect(screen.getByText(/3 人份/)).toBeInTheDocument()
    expect(screen.getByText(/25 分钟/)).toBeInTheDocument()

    // Cover image
    const img = document.querySelector('.detail-cover img') as HTMLImageElement
    expect(img).toBeInTheDocument()
    expect(img?.src).toContain('gongbao.jpg')
  })

  it('食材清单正确渲染', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('🥬 食材清单')).toBeInTheDocument()
    })

    expect(screen.getByText('鸡胸肉')).toBeInTheDocument()
    expect(screen.getByText('花生米')).toBeInTheDocument()
    expect(screen.getByText('300 g')).toBeInTheDocument()
    expect(screen.getByText('50 g')).toBeInTheDocument()
  })

  it('制作步骤正确渲染', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('📝 制作步骤')).toBeInTheDocument()
    })

    // 6 steps should be rendered
    const steps = document.querySelectorAll('.detail-step')
    expect(steps.length).toBe(6)

    // Step 1 content
    expect(screen.getByText('鸡胸肉切丁，用料酒、生抽、淀粉腌制15分钟')).toBeInTheDocument()
    // Last step
    expect(screen.getByText('大火收汁，撒上葱花出锅')).toBeInTheDocument()
  })

  it('分类标签（categoryTags）正确渲染', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('川菜')).toBeInTheDocument()
    })

    expect(screen.getByText('麻辣')).toBeInTheDocument()
    expect(screen.getByText('炒')).toBeInTheDocument()
    expect(screen.getByText('普通家常')).toBeInTheDocument()
  })

  it('点击步骤可切换高亮状态', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('大火收汁，撒上葱花出锅')).toBeInTheDocument()
    })

    const steps = document.querySelectorAll('.detail-step')
    expect(steps.length).toBe(6)

    // Click step 3
    fireEvent.click(steps[2])
    expect(steps[2].classList.contains('is-active')).toBe(true)
    expect(steps[0].classList.contains('is-active')).toBe(false)

    // Click step 3 again to toggle off
    fireEvent.click(steps[2])
    expect(steps[2].classList.contains('is-active')).toBe(false)
  })

  it('带有收藏按钮', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('收藏')).toBeInTheDocument()
    })
  })

  it('已收藏状态显示正确', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: true,
      favoriteId: 'fav1',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('已收藏')).toBeInTheDocument()
    })
  })

  it('评论组件正常挂载', async () => {
    ;(api.getRecipeById as any).mockResolvedValue({ data: mockRecipe })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByTestId('comment-section')).toBeInTheDocument()
    })
    expect(screen.getByText('Comments for 1a2b3c')).toBeInTheDocument()
  })

  it('无 categoryTags 时不显示标签行', async () => {
    const withoutTags = { ...mockRecipe, categoryTags: null }
    ;(api.getRecipeById as any).mockResolvedValue({ data: withoutTags })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })

    const tagDim = document.querySelector('.detail-tags-row')
    expect(tagDim).not.toBeInTheDocument()
  })

  it('API 返回属性名不匹配时容错（res.data 兼容）', async () => {
    // Simulate response where getRecipeById returns { code: 0, data: recipe }
    ;(api.getRecipeById as any).mockResolvedValue({
      code: 0,
      data: mockRecipe,
    })
    ;(api.getFavoriteStatus as any).mockResolvedValue({
      isFavorited: false,
      favoriteId: '',
    })

    renderDetail()

    await waitFor(() => {
      expect(screen.getByText('宫保鸡丁')).toBeInTheDocument()
    })
    expect(screen.getByText(/家常美食/)).toBeInTheDocument()
  })
})
