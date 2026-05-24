import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VideoPlayer from '../components/VideoPlayer'

vi.mock('../api', () => ({
  getRecipeVideos: vi.fn(),
}))

import { getRecipeVideos } from '../api'

const mockVideos = {
  list: [
    {
      id: 'v1', recipeId: 'r1', videoUrl: 'https://youtube.com/watch?v=abc123',
      platform: 'youtube', coverImage: '', title: '教学视频1', duration: 120, sortOrder: 0,
    },
    {
      id: 'v2', recipeId: 'r1', videoUrl: 'https://player.bilibili.com/player.html?bvid=BV12345',
      platform: 'bilibili', coverImage: '', title: 'B站教程', duration: 300, sortOrder: 1,
    },
  ],
  total: 2,
}

describe('VideoPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getRecipeVideos as any).mockResolvedValue(mockVideos)
  })

  it('无视频时不渲染', async () => {
    ;(getRecipeVideos as any).mockResolvedValue({ list: [], total: 0 })
    const { container } = render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      expect(container.innerHTML).toBe('')
    })
  })

  it('有视频时显示视频区域', async () => {
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      expect(screen.getByText('🎬 视频教程')).toBeDefined()
    })
  })

  it('显示视频标题', async () => {
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      expect(screen.getByText('教学视频1')).toBeDefined()
    })
  })

  it('多视频显示缩略图导航', async () => {
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      const thumbBtns = screen.getAllByRole('button')
      expect(thumbBtns.length).toBeGreaterThan(1)
    })
  })

  it('点击缩略图切换视频', async () => {
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      expect(screen.getByText('教学视频1')).toBeDefined()
    })
    const thumbBtns = screen.getAllByRole('button')
    fireEvent.click(thumbBtns[thumbBtns.length - 1])
    await waitFor(() => {
      expect(screen.getByText('B站教程')).toBeDefined()
    })
  })

  it('生成正确的 YouTube 嵌入 URL', async () => {
    const videosWithYoutube = {
      list: [{
        id: 'v1', recipeId: 'r1', videoUrl: 'https://youtu.be/abcXYZ123',
        platform: 'youtube', coverImage: '', title: 'YT视频', duration: 120, sortOrder: 0,
      }],
      total: 1,
    }
    ;(getRecipeVideos as any).mockResolvedValue(videosWithYoutube)
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      const iframe = document.querySelector('iframe')
      expect(iframe?.src).toContain('youtube.com/embed/abcXYZ123')
    })
  })

  it('生成正确的 Bilibili 嵌入 URL', async () => {
    const videosWithBili = {
      list: [{
        id: 'v1', recipeId: 'r1', videoUrl: 'https://bilibili.com/video/BV1GJ411x1y7?p=1',
        platform: 'bilibili', coverImage: '', title: 'B站视频', duration: 200, sortOrder: 0,
      }],
      total: 1,
    }
    ;(getRecipeVideos as any).mockResolvedValue(videosWithBili)
    render(<VideoPlayer recipeId="r1" />)
    await waitFor(() => {
      const iframe = document.querySelector('iframe')
      expect(iframe?.src).toContain('player.bilibili.com')
    })
  })
})