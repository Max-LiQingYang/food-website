import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import PreferencesPage from '../pages/PreferencesPage'
import { getPreferences, updatePreferences } from '../api'

vi.mock('../api', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1, username: 'test' } }),
}))

const defaultPrefs = {
  diet: '',
  cuisine: '',
  difficulty: '',
  maxCookTime: '',
  allergies: [],
  excludedIngredients: [],
}

describe('PreferencesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPreferences).mockResolvedValue(defaultPrefs)
  })

  const renderPage = () => render(
    <BrowserRouter>
      <PreferencesPage />
    </BrowserRouter>
  )

  it('加载完成显示所有设置区域', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/饮食习惯/i)).toBeTruthy()
      expect(screen.getByText(/偏好菜系/i)).toBeTruthy()
      expect(screen.getByText(/烹饪难度/i)).toBeTruthy()
      expect(screen.getByText(/保存偏好设置/i)).toBeTruthy()
    })
  })

  it('选择饮食习惯后高亮按钮', async () => {
    renderPage()
    await waitFor(() => {
      const vegBtn = screen.getByText(/素食/)
      fireEvent.click(vegBtn)
      expect(vegBtn.classList.contains('is-active')).toBe(true)
    })
  })

  it('切换过敏原复选框', async () => {
    renderPage()
    await waitFor(() => {
      const cb = screen.getByLabelText('花生')
      fireEvent.click(cb)
      expect(cb).toBeChecked()

      fireEvent.click(cb)
      expect(cb).not.toBeChecked()
    })
  })

  it('添加排除食材标签', async () => {
    renderPage()
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/香菜|芹菜/)
      const allBtns = screen.getAllByText('添加')
      // The exclude-ingredient add button is the first one
      const addBtn = allBtns[0]

      fireEvent.change(input, { target: { value: '香菜' } })
      fireEvent.click(addBtn)

      expect(screen.getByText('香菜')).toBeTruthy()
    })
  })

  it('保存偏好设置调用 API', async () => {
    vi.mocked(updatePreferences).mockResolvedValue(undefined)
    renderPage()

    await waitFor(() => {
      const saveBtn = screen.getByText(/保存偏好设置/i)
      fireEvent.click(saveBtn)

      expect(updatePreferences).toHaveBeenCalled()
    })
  })
})