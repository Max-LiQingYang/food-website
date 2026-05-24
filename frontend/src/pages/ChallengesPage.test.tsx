import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChallengesPage from '../pages/ChallengesPage'

vi.mock('../api', () => ({
  getChallenges: vi.fn(),
}))

import { getChallenges } from '../api'

const mockChallenges = [
  {
    id: '1', title: '夏日清爽挑战', theme: 'summer', description: '做一道夏日清爽美食',
    status: 'active', submissionCount: 5, voteCount: 23, coverImage: '',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: '2', title: '甜品大师赛', theme: 'dessert', description: '谁的甜品最诱人',
    status: 'voting', submissionCount: 12, voteCount: 45, coverImage: '',
    createdAt: '2026-04-01T00:00:00Z',
  },
  {
    id: '3', title: '快手菜挑战', theme: 'quick', description: '15分钟搞定一道菜',
    status: 'closed', submissionCount: 8, voteCount: 30, coverImage: '',
    createdAt: '2026-03-01T00:00:00Z',
  },
]

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ChallengesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getChallenges as any).mockResolvedValue({ list: mockChallenges, total: 3 })
  })

  it('加载时显示加载中', () => {
    ;(getChallenges as any).mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<ChallengesPage />)
    expect(screen.getByText('加载中...')).toBeDefined()
  })

  it('显示挑战列表', async () => {
    renderWithRouter(<ChallengesPage />)
    await waitFor(() => {
      expect(screen.getByText('夏日清爽挑战')).toBeDefined()
      expect(screen.getByText('甜品大师赛')).toBeDefined()
      expect(screen.getByText('快手菜挑战')).toBeDefined()
    })
  })

  it('显示状态徽章', async () => {
    renderWithRouter(<ChallengesPage />)
    await waitFor(() => {
      expect(screen.getByText('进行中')).toBeDefined()
      expect(screen.getByText('投票中')).toBeDefined()
      expect(screen.getByText('已结束')).toBeDefined()
    })
  })

  it('显示统计数据', async () => {
    renderWithRouter(<ChallengesPage />)
    await waitFor(() => {
      expect(screen.getByText(/5.*投稿/)).toBeDefined()
      expect(screen.getByText(/23.*投票/)).toBeDefined()
    })
  })

  it('筛选按钮可点击', async () => {
    renderWithRouter(<ChallengesPage />)
    await waitFor(() => {
      expect(screen.getByText('全部')).toBeDefined()
      expect(screen.getAllByText('进行中').length).toBeGreaterThan(0)
      expect(screen.getAllByText('投票中').length).toBeGreaterThan(0)
    })
    const activeBtns = screen.getAllByText('进行中')
    fireEvent.click(activeBtns[0])
    expect(getChallenges).toHaveBeenCalledWith({ status: 'active' })
  })

  it('空状态显示提示', async () => {
    ;(getChallenges as any).mockResolvedValue({ list: [], total: 0 })
    renderWithRouter(<ChallengesPage />)
    await waitFor(() => {
      expect(screen.getByText('暂无挑战活动')).toBeDefined()
    })
  })
})