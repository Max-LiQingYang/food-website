import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChallengeDetailPage from '../pages/ChallengeDetailPage'

vi.mock('../api', () => ({
  getChallenge: vi.fn(),
  getChallengeSubmissions: vi.fn(),
  getChallengeRanking: vi.fn(),
  voteChallenge: vi.fn(),
}))

import { getChallenge, getChallengeSubmissions, getChallengeRanking, voteChallenge } from '../api'

const mockChallenge = {
  id: '1', title: '夏日清爽挑战', theme: 'summer',
  description: '做一道夏日清爽美食', status: 'active',
  submissionCount: 2, voteCount: 10, coverImage: '',
  rules: '1. 必须使用夏季食材',
  createdAt: '2026-05-01T00:00:00Z',
}

const mockSubmissions = {
  code: 0,
  data: {
    list: [
      {
        id: 's1', challengeId: '1', recipeId: 'r1', userId: 'u1',
        voteCount: 3, description: '我的投稿',
        recipe: { id: 'r1', title: '凉拌黄瓜', coverImage: '', description: '清凉爽口' },
        submitter: { id: 'u1', username: 'chef1', nickname: '大厨1' },
      },
      {
        id: 's2', challengeId: '1', recipeId: 'r2', userId: 'u2',
        voteCount: 1, description: '',
        recipe: { id: 'r2', title: '夏日水果沙拉', coverImage: '' },
        submitter: { id: 'u2', username: 'cook2', nickname: '' },
      },
    ],
    total: 2,
    page: 1,
    pageSize: 10,
  },
}

const mockRanking = {
  code: 0,
  data: {
    list: [
      { id: 's1', rank: 1, recipeId: 'r1', voteCount: 3,
        recipe: { id: 'r1', title: '凉拌黄瓜' },
        submitter: { id: 'u1', username: 'chef1', nickname: '大厨1' },
      },
      { id: 's2', rank: 2, recipeId: 'r2', voteCount: 1,
        recipe: { id: 'r2', title: '夏日水果沙拉' },
      },
    ],
    total: 2,
    page: 1,
    pageSize: 10,
  },
}

function renderDetail(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/challenges/${id}`]}>
      <Routes>
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ChallengeDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getChallenge as any).mockResolvedValue(mockChallenge)
    ;(getChallengeSubmissions as any).mockResolvedValue(mockSubmissions)
    ;(getChallengeRanking as any).mockResolvedValue(mockRanking)
  })

  it('显示挑战详情', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('夏日清爽挑战')).toBeDefined()
      expect(screen.getByText(/做一道夏日清爽美食/)).toBeDefined()
    })
  })

  it('显示投稿列表', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('凉拌黄瓜')).toBeDefined()
      expect(screen.getByText('夏日水果沙拉')).toBeDefined()
    })
  })

  it('显示规则', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText(/必须使用夏季食材/)).toBeDefined()
    })
  })

  it('切换到排行榜', async () => {
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('凉拌黄瓜')).toBeDefined()
    })
    fireEvent.click(screen.getByText(/排行榜/))
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeDefined()
    })
  })

  it('投票按钮可点击', async () => {
    ;(voteChallenge as any).mockResolvedValue({ code: 0, data: { message: '投票成功' } })
    ;(getChallengeSubmissions as any).mockResolvedValue(mockSubmissions)
    ;(getChallengeRanking as any).mockResolvedValue(mockRanking)
    renderDetail()
    await waitFor(() => {
      const voteBtns = screen.getAllByText('👍 投票')
      expect(voteBtns.length).toBeGreaterThan(0)
      fireEvent.click(voteBtns[0])
    })
    await waitFor(() => {
      expect(voteChallenge).toHaveBeenCalled()
    })
  })

  it('不存在的挑战显示提示', async () => {
    ;(getChallenge as any).mockRejectedValue(new Error('Not found'))
    renderDetail()
    await waitFor(() => {
      expect(screen.getByText('挑战不存在')).toBeDefined()
    })
  })
})