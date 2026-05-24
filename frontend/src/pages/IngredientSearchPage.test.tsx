import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import IngredientSearchPage from '../pages/IngredientSearchPage'

vi.mock('../api', () => ({
  searchByIngredients: vi.fn(),
}))

import { searchByIngredients } from '../api'

const mockResults = {
  list: [
    {
      id: '1', title: '番茄炒蛋', coverImage: '', description: '经典家常菜',
      category: '中餐', difficulty: 'easy', cookTime: 15,
      matchRatio: 100, matchCount: 2, totalIngredients: 2,
      matchedIngredients: ['番茄', '鸡蛋'],
      missingIngredients: [],
      favoriteCount: 100,
    },
    {
      id: '2', title: '番茄汤', coverImage: '', description: '酸甜番茄汤',
      category: '中餐', difficulty: 'easy', cookTime: 20,
      matchRatio: 50, matchCount: 1, totalIngredients: 2,
      matchedIngredients: ['番茄'],
      missingIngredients: ['盐'],
      favoriteCount: 50,
    },
  ],
  total: 2,
  userIngredients: ['番茄', '鸡蛋'],
}

describe('IngredientSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(searchByIngredients as any).mockResolvedValue(mockResults)
  })

  it('显示标题和输入框', () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    expect(screen.getByText('🔍 手头食材搜索')).toBeDefined()
    expect(screen.getByPlaceholderText('输入食材名称（如：鸡蛋）')).toBeDefined()
  })

  it('添加食材标签', () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const input = screen.getByPlaceholderText('输入食材名称（如：鸡蛋）')
    const addBtn = screen.getByText('添加')
    fireEvent.change(input, { target: { value: '番茄' } })
    fireEvent.click(addBtn)
    expect(screen.getByText('番茄')).toBeDefined()
  })

  it('按 Enter 添加食材', () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const input = screen.getByPlaceholderText('输入食材名称（如：鸡蛋）') as HTMLInputElement
    fireEvent.change(input, { target: { value: '鸡蛋' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('鸡蛋')).toBeDefined()
  })

  it('移除食材标签', () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const input = screen.getByPlaceholderText('输入食材名称（如：鸡蛋）') as HTMLInputElement
    const addBtn = screen.getByText('添加')
    fireEvent.change(input, { target: { value: '番茄' } })
    fireEvent.click(addBtn)
    expect(screen.getByText('番茄')).toBeDefined()
    const removeBtn = screen.getByText('×')
    fireEvent.click(removeBtn)
    expect(screen.queryByText('番茄')).toBeNull()
  })

  it('搜索按钮禁用当无食材', () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const searchBtn = screen.getByText('🔍 搜索食谱')
    expect(searchBtn.hasAttribute('disabled')).toBe(true)
  })

  it('搜索显示结果', async () => {
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const input = screen.getByPlaceholderText('输入食材名称（如：鸡蛋）') as HTMLInputElement
    const addBtn = screen.getByText('添加')
    fireEvent.change(input, { target: { value: '番茄' } })
    fireEvent.click(addBtn)
    fireEvent.change(input, { target: { value: '鸡蛋' } })
    fireEvent.click(addBtn)
    fireEvent.click(screen.getByText('🔍 搜索食谱'))
    await waitFor(() => {
      expect(searchByIngredients).toHaveBeenCalledWith(['番茄', '鸡蛋'])
    })
  })

  it('空结果显示提示', async () => {
    ;(searchByIngredients as any).mockResolvedValue({ list: [], total: 0, userIngredients: [] })
    render(<MemoryRouter><IngredientSearchPage /></MemoryRouter>)
    const input = screen.getByPlaceholderText('输入食材名称（如：鸡蛋）') as HTMLInputElement
    fireEvent.change(input, { target: { value: '奇异食材' } })
    fireEvent.click(screen.getByText('添加'))
    fireEvent.click(screen.getByText('🔍 搜索食谱'))
    await waitFor(() => {
      expect(screen.getByText('这些食材没能匹配到食谱')).toBeDefined()
    })
  })
})