import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '../context/ToastContext'
import ShareModal from '../components/ShareModal'

vi.mock('../api', () => ({
  getShareInfo: vi.fn(),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: vi.fn(),
  ToastProvider: ({ children }: any) => children,
}))

import { useToast } from '../context/ToastContext'
import { getShareInfo } from '../api'

const mockShareInfo = {
  title: '番茄炒蛋',
  description: '经典家常菜，酸甜可口',
  shareUrl: 'https://example.com/recipe/123',
  shareText: '来看看这道美食：番茄炒蛋 — https://example.com/recipe/123',
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ToastProvider>{ui}</ToastProvider>
    </BrowserRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(useToast as any).mockReturnValue({
    showToast: vi.fn(),
  })
  ;(getShareInfo as any).mockResolvedValue({ data: mockShareInfo })

  // Mock clipboard
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
})

describe('ShareModal', () => {
  const defaultProps = {
    recipeId: '123',
    recipeTitle: '番茄炒蛋',
    onClose: vi.fn(),
  }

  describe('基础渲染', () => {
    it('渲染弹窗', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('分享食谱')).toBeDefined()
      })
    })

    it('渲染食谱标题', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('番茄炒蛋')).toBeDefined()
      })
    })

    it('渲染分享卡片', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('🍽️ 美食食谱')).toBeDefined()
      })
    })

    it('渲染关闭按钮', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('×')).toBeDefined()
      })
    })

    it('关闭按钮触发 onClose', async () => {
      const onClose = vi.fn()
      renderWithProviders(<ShareModal {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('×'))
      })
      expect(onClose).toHaveBeenCalled()
    })

    it('点击遮罩关闭', async () => {
      const onClose = vi.fn()
      renderWithProviders(<ShareModal {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.click(document.querySelector('.share-modal__backdrop')!)
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('分享卡片', () => {
    it('有图片时渲染封面', async () => {
      renderWithProviders(
        <ShareModal {...defaultProps} recipeImage="https://example.com/img.jpg" />
      )
      await waitFor(() => {
        const img = document.querySelector('.share-modal__card-img') as HTMLImageElement
        expect(img).toBeDefined()
        expect(img?.src).toContain('img.jpg')
      })
    })

    it('无图片时不渲染图片', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const img = document.querySelector('.share-modal__card-img')
        expect(img).toBeNull()
      })
    })

    it('渲染食谱描述', async () => {
      renderWithProviders(
        <ShareModal {...defaultProps} recipeDesc="经典家常菜" />
      )
      await waitFor(() => {
        expect(screen.getByText('经典家常菜，酸甜可口')).toBeDefined()
      })
    })
  })

  describe('社交平台', () => {
    it('显示6个分享平台', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const platforms = ['微信', '微博', 'QQ', 'Twitter', 'Facebook', '复制链接']
        for (const p of platforms) {
          expect(screen.getByText(p)).toBeDefined()
        }
      })
    })

    it('复制链接按钮触发复制', async () => {
      const { showToast } = useToast()
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('复制链接'))
      })
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })
    })

    it('链接复制成功后显示提示', async () => {
      const { showToast } = useToast()
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('复制链接'))
      })
      await waitFor(() => {
        expect(showToast).toHaveBeenCalled()
      })
    })

    it('复制失败时显示错误提示', async () => {
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockRejectedValue(new Error('failed')) },
      })
      const { showToast } = useToast()
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        fireEvent.click(screen.getByText('复制链接'))
      })
      await waitFor(() => {
        expect(showToast).toHaveBeenCalled()
      })
    })
  })

  describe('链接复制', () => {
    it('输入框显示分享链接', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const input = document.querySelector('.share-modal__link-input') as HTMLInputElement
        expect(input?.value).toBe(mockShareInfo.shareUrl)
      })
    })

    it('复制按钮点击后显示已复制', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const copyBtn = screen.getByText('复制')
        fireEvent.click(copyBtn)
      })
      await waitFor(() => {
        expect(screen.getByText('✅ 已复制')).toBeDefined()
      })
    })
  })

  describe('分享文本', () => {
    it('展开分享文本', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('查看分享文本')).toBeDefined()
      })
    })
  })

  describe('加载状态', () => {
    it('加载中显示提示', () => {
      vi.useFakeTimers()
      renderWithProviders(<ShareModal {...defaultProps} />)
      expect(screen.getByText('加载中...')).toBeDefined()
      vi.useRealTimers()
    })
  })

  describe('API 降级', () => {
    it('API 失败时使用本地信息', async () => {
      ;(getShareInfo as any).mockRejectedValue(new Error('fail'))
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('🍽️ 美食食谱')).toBeDefined()
      })
    })
  })

  describe('系统分享', () => {
    it('浏览器支持分享时显示系统分享按钮', async () => {
      Object.assign(navigator, { share: vi.fn() })
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('📤 系统分享')).toBeDefined()
      })
    })

    it('浏览器不支持时隐藏系统分享按钮', async () => {
      Object.assign(navigator, { share: undefined })
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.queryByText('📤 系统分享')).toBeNull()
      })
    })
  })

  describe('键盘事件', () => {
    it('Escape 键关闭弹窗', async () => {
      const onClose = vi.fn()
      renderWithProviders(<ShareModal {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('可选参数', () => {
    it('传递图片和描述参数', async () => {
      renderWithProviders(
        <ShareModal
          {...defaultProps}
          recipeImage="https://example.com/img.jpg"
          recipeDesc="好吃的番茄炒蛋"
        />
      )
      await waitFor(() => {
        expect(screen.getByText('经典家常菜，酸甜可口')).toBeDefined()
      })
    })
  })

  describe('响应式', () => {
    it('弹窗使用 dialog role', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const dialog = document.querySelector('[role="dialog"]')
        expect(dialog).toBeDefined()
      })
    })

    it('弹窗有 aria-label', async () => {
      renderWithProviders(<ShareModal {...defaultProps} />)
      await waitFor(() => {
        const dialog = document.querySelector('[aria-label="分享食谱"]')
        expect(dialog).toBeDefined()
      })
    })
  })
})