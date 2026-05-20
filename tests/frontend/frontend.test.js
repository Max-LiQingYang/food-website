'use strict'

/**
 * 前端组件测试 - 收藏食谱功能
 * 使用 Jest + Vue Test Utils
 *
 * API Mock：通过 jest.mock('../../frontend/api') 全局设置
 * localStorage mock：在 jest.setup.js 中全局设置
 */
const { mount } = require('@vue/test-utils')

// Mock 路由（Vue Router 4）
jest.mock('vue-router', () => ({
  useRoute: () => ({ fullPath: '/favorites' }),
  useRouter: () => ({ push: jest.fn() }),
  default: { install: jest.fn() }
}))

// Mock API — 路径必须与 Vue 组件中的 import '../api' 解析到同一模块
jest.mock('../../frontend/api', () => ({
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  getFavoriteList: jest.fn(),
  getFavoriteStatus: jest.fn(),
  default: {
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    getFavoriteList: jest.fn(),
    getFavoriteStatus: jest.fn()
  }
}))

const apiMock = jest.requireMock('../../frontend/api')
const mockAddFavorite = apiMock.addFavorite
const mockRemoveFavorite = apiMock.removeFavorite
const mockGetFavoriteList = apiMock.getFavoriteList
const mockGetFavoriteStatus = apiMock.getFavoriteStatus

// Mock $message 全局
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn()
}

describe('FavoriteButton 组件测试', () => {
  let FavoriteButton

  beforeEach(() => {
    mockAddFavorite.mockClear()
    mockRemoveFavorite.mockClear()
    mockMessage.success.mockClear()
    mockMessage.error.mockClear()
    mockMessage.warning.mockClear()
    mockAddFavorite.mockResolvedValue({ data: { id: 'fav-id-1' } })
    mockRemoveFavorite.mockResolvedValue({ data: null })
    FavoriteButton = require('frontend/components/FavoriteButton.vue').default
  })

  test('未收藏时应显示"收藏"文本', () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })
    expect(wrapper.text()).toContain('收藏')
  })

  test('已收藏时应显示"已收藏"文本', () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: true },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })
    expect(wrapper.text()).toContain('已收藏')
  })

  test('点击未收藏按钮应调用 addFavorite API', async () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })

    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(mockAddFavorite).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000')
  })

  test('点击已收藏按钮应调用 removeFavorite API', async () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: true },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })

    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(mockRemoveFavorite).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000')
  })

  test('API 失败后应回滚 UI 状态', async () => {
    // 延迟 reject，确保 trigger('click') 返回时乐观更新仍保持 true
    mockAddFavorite.mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('网络错误')), 50))
    )

    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })

    expect(wrapper.vm.localFavorited).toBe(false)

    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()
    // 乐观更新：UI 先变为 true
    expect(wrapper.vm.localFavorited).toBe(true)
    // 等待延迟的 API reject 后回滚
    await new Promise((r) => setTimeout(r, 100))
    expect(wrapper.vm.localFavorited).toBe(false)
    expect(mockMessage.error).toHaveBeenCalled()
  })

  test('API 请求中按钮应有 is-loading class 且可被禁用', async () => {
    // 让 API 永不 resolve，这样 loading 会一直为 true
    mockAddFavorite.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })

    // 点击触发 loading
    await wrapper.find('button').trigger('click')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button')
    expect(btn.classes()).toContain('is-loading')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('loading 状态下重复点击应被忽略', async () => {
    mockAddFavorite.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })

    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('button').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(mockAddFavorite).toHaveBeenCalledTimes(1)
  })

  test('recipeId props 类型应为 String', () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })
    expect(typeof wrapper.vm.recipeId).toBe('string')
  })

  test('DEBUG: checkLogin 应返回 true', () => {
    const wrapper = mount(FavoriteButton, {
      props: { recipeId: '550e8400-e29b-41d4-a716-446655440000', isFavorited: false },
      global: {
        mocks: { $message: mockMessage, $route: { fullPath: '/favorites' }, $router: { push: jest.fn() } }
      }
    })
    console.log('token from global.localStorage:', global.localStorage.getItem('token'))
    console.log('token from localStorage:', localStorage.getItem('token'))
    console.log('checkLogin:', wrapper.vm.checkLogin())
    expect(wrapper.vm.checkLogin()).toBe(true)
  })
})

describe('FavoriteList 组件测试', () => {
  let FavoriteList

  const emptyResponse = {
    data: { total: 0, page: 1, pageSize: 12, list: [] }
  }

  const paginatedResponse = {
    data: {
      total: 25,
      page: 1,
      pageSize: 12,
      list: [
        {
          id: 'fav-1',
          userId: 'user-1',
          recipeId: 'recipe-1',
          createdAt: '2024-06-01T10:00:00Z',
          removing: false,
          recipe: {
            id: 'recipe-1',
            title: '红烧肉',
            coverImage: 'https://example.com/hongshao.jpg',
            author: '张三',
            cookTime: 60
          }
        },
        {
          id: 'fav-2',
          userId: 'user-1',
          recipeId: 'recipe-2',
          createdAt: '2024-06-02T10:00:00Z',
          removing: false,
          recipe: {
            id: 'recipe-2',
            title: '宫保鸡丁',
            coverImage: 'https://example.com/gongbao.jpg',
            author: '李四',
            cookTime: 30
          }
        }
      ]
    }
  }

  beforeEach(() => {
    mockGetFavoriteList.mockClear()
    mockRemoveFavorite.mockClear()
    mockMessage.success.mockClear()
    mockMessage.error.mockClear()
    mockMessage.warning.mockClear()
    mockGetFavoriteList.mockResolvedValue(emptyResponse)
    mockRemoveFavorite.mockResolvedValue({ data: null })
    FavoriteList = require('frontend/pages/FavoriteList.vue').default
  })

  test('空列表应显示"还没有收藏任何食谱"文案', async () => {
    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('还没有收藏任何食谱')
  })

  test('空列表不应显示食谱卡片', async () => {
    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.recipe-card').length).toBe(0)
  })

  test('有收藏时应显示食谱卡片', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.recipe-card').length).toBe(2)
  })

  test('卡片应显示食谱标题和作者', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('红烧肉')
    expect(wrapper.text()).toContain('张三')
  })

  test('页面标题应显示总数', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('共 25 个食谱')
  })

  test('总数超过 pageSize 应显示分页控件', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.favorite-list__pagination').exists()).toBe(true)
    expect(wrapper.text()).toContain('第 1 / 3 页')
  })

  test('总数小于 pageSize 不应显示分页控件', async () => {
    mockGetFavoriteList.mockResolvedValue({
      data: { total: 5, page: 1, pageSize: 12, list: paginatedResponse.data.list.slice(0, 5) }
    })

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.favorite-list__pagination').exists()).toBe(false)
  })

  test('点击下一页应请求 page=2', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('.pagination-btn:last-child').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(mockGetFavoriteList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    )
  })

  test('点击取消收藏应调用 removeFavorite API', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('.recipe-card__unfav').trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(mockRemoveFavorite).toHaveBeenCalledWith('recipe-1')
  })

  test('取消收藏成功后列表应减少一项', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.recipe-card').length).toBe(2)

    await wrapper.find('.recipe-card__unfav').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.recipe-card').length).toBe(1)
    expect(wrapper.vm.pagination.total).toBe(24)
  })


  test('取消收藏 API 失败应显示错误提示且不改变列表', async () => {
    mockGetFavoriteList.mockResolvedValue(paginatedResponse)
    mockRemoveFavorite.mockRejectedValueOnce(new Error('取消失败'))

    const wrapper = mount(FavoriteList, {
      global: { mocks: { $message: mockMessage, $router: { push: jest.fn() } } }
    })

    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    await wrapper.find('.recipe-card__unfav').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(mockMessage.error).toHaveBeenCalled()
    expect(wrapper.findAll('.recipe-card').length).toBe(2)
  })
})
