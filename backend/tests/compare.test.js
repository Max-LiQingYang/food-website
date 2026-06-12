'use strict'

const { aggregateDimensionAverages } = require('../routes/compare')

describe('Compare Route Module', () => {
  it('导出 router 对象', () => {
    const compareModule = require('../routes/compare')
    expect(compareModule).toBeDefined()
    expect(typeof compareModule.router).toBe('function')
  })

  it('router 有 post 处理函数', () => {
    const compareModule = require('../routes/compare')
    const routes = compareModule.router.stack || []
    const postRoutes = routes.filter((r) => r.route && r.route.path === '/' && r.route.methods.post)
    expect(postRoutes.length).toBe(1)
  })

  it('导出 aggregateDimensionAverages 纯函数', () => {
    expect(typeof aggregateDimensionAverages).toBe('function')
  })
})

describe('aggregateDimensionAverages', () => {
  it('正确聚合多个食谱的维度评分', () => {
    const comments = [
      { recipeId: 'r1', taste: 4, difficulty: 2, presentation: 3, value: 5 },
      { recipeId: 'r1', taste: 5, difficulty: 3, presentation: 4, value: 4 },
      { recipeId: 'r2', taste: 3, difficulty: 4, presentation: 5, value: 3 },
    ]
    const result = aggregateDimensionAverages(comments, ['r1', 'r2'])

    // r1: taste=(4+5)/2=4.5, difficulty=(2+3)/2=2.5, presentation=(3+4)/2=3.5, value=(5+4)/2=4.5
    expect(result.r1.taste).toEqual({ average: 4.5, count: 2 })
    expect(result.r1.difficulty).toEqual({ average: 2.5, count: 2 })
    expect(result.r1.presentation).toEqual({ average: 3.5, count: 2 })
    expect(result.r1.value).toEqual({ average: 4.5, count: 2 })

    // r2: only 1 comment
    expect(result.r2.taste).toEqual({ average: 3, count: 1 })
    expect(result.r2.difficulty).toEqual({ average: 4, count: 1 })
  })

  it('无评分时返回 {average:0, count:0}', () => {
    const result = aggregateDimensionAverages([], ['r1'])
    expect(result.r1.taste).toEqual({ average: 0, count: 0 })
    expect(result.r1.difficulty).toEqual({ average: 0, count: 0 })
    expect(result.r1.presentation).toEqual({ average: 0, count: 0 })
    expect(result.r1.value).toEqual({ average: 0, count: 0 })
  })

  it('部分维度为 NULL 时仅计算非 NULL 维度', () => {
    const comments = [
      { recipeId: 'r1', taste: 5, difficulty: null, presentation: null, value: 3 },
    ]
    const result = aggregateDimensionAverages(comments, ['r1'])
    expect(result.r1.taste).toEqual({ average: 5, count: 1 })
    expect(result.r1.difficulty).toEqual({ average: 0, count: 0 })
    expect(result.r1.presentation).toEqual({ average: 0, count: 0 })
    expect(result.r1.value).toEqual({ average: 3, count: 1 })
  })

  it('忽略不在 recipeIds 列表中的评论', () => {
    const comments = [
      { recipeId: 'r1', taste: 4, difficulty: 2, presentation: 3, value: 5 },
      { recipeId: 'r3', taste: 1, difficulty: 1, presentation: 1, value: 1 }, // r3 not in list
    ]
    const result = aggregateDimensionAverages(comments, ['r1'])
    expect(result.r1.taste).toEqual({ average: 4, count: 1 })
    expect(result).not.toHaveProperty('r3')
  })

  it('保留 1 位小数精度', () => {
    // (4+5+4)/3 = 4.333... → 4.3
    const comments = [
      { recipeId: 'r1', taste: 4, difficulty: null, presentation: null, value: null },
      { recipeId: 'r1', taste: 5, difficulty: null, presentation: null, value: null },
      { recipeId: 'r1', taste: 4, difficulty: null, presentation: null, value: null },
    ]
    const result = aggregateDimensionAverages(comments, ['r1'])
    expect(result.r1.taste).toEqual({ average: 4.3, count: 3 })
  })
})
