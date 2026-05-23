'use strict'

const compareModule = require('../routes/compare')

describe('Compare Route Module', () => {
  it('导出 router 对象', () => {
    expect(compareModule).toBeDefined()
    expect(typeof compareModule).toBe('function')
  })

  it('router 有 post 处理函数', () => {
    const routes = compareModule.stack || []
    const postRoutes = routes.filter((r: any) => r.route && r.route.path === '/' && r.route.methods.post)
    expect(postRoutes.length).toBe(1)
  })
})