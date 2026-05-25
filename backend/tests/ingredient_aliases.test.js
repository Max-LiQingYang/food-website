'use strict'

/**
 * tests/ingredient_aliases.test.js
 * 食材别名映射表单元测试
 */

const { expandIngredients, getAllCanonicalNames, getHotIngredients } = require('../utils/ingredientAliases')

describe('食材别名工具函数', () => {
  test('expandIngredients 展开番茄组', () => {
    const expanded = expandIngredients(['番茄'])
    expect(expanded).toContain('番茄')
    expect(expanded).toContain('西红柿')
    expect(expanded).toContain('蕃茄')
  })

  test('expandIngredients 从别名反向查找', () => {
    const expanded = expandIngredients(['西红柿'])
    expect(expanded).toContain('番茄')
    expect(expanded).toContain('西红柿')
    expect(expanded).toContain('蕃茄')
  })

  test('expandIngredients 展开土豆组', () => {
    const expanded = expandIngredients(['马铃薯'])
    expect(expanded).toContain('马铃薯')
    expect(expanded).toContain('土豆')
    expect(expanded).toContain('洋芋')
  })

  test('expandIngredients 展开淀粉组', () => {
    const expanded = expandIngredients(['生粉'])
    expect(expanded).toContain('生粉')
    expect(expanded).toContain('淀粉')
    expect(expanded).toContain('芡粉')
    expect(expanded).toContain('太白粉')
    expect(expanded).toContain('玉米淀粉')
  })

  test('expandIngredients 展开黄瓜组', () => {
    const expanded = expandIngredients(['黄瓜'])
    expect(expanded).toContain('黄瓜')
    expect(expanded).toContain('青瓜')
    expect(expanded).toContain('胡瓜')
  })

  test('expandIngredients 展开白菜组', () => {
    const expanded = expandIngredients(['包菜'])
    expect(expanded).toContain('包菜')
    expect(expanded).toContain('卷心菜')
    expect(expanded).toContain('白菜')
    expect(expanded).toContain('高丽菜')
  })

  test('expandIngredients 去重', () => {
    const expanded = expandIngredients(['番茄', '西红柿'])
    expect(expanded).toContain('番茄')
    expect(expanded).toContain('西红柿')
    expect(expanded).toContain('蕃茄')
    // 所有别名去重后只出现一次
    const uniqueCount = new Set(expanded).size
    expect(expanded.length).toBe(uniqueCount)
  })

  test('expandIngredients 无别名词的保留原值', () => {
    const expanded = expandIngredients(['火龙果', '榴莲'])
    expect(expanded).toContain('火龙果')
    expect(expanded).toContain('榴莲')
    expect(expanded.length).toBe(2)
  })

  test('expandIngredients 空输入', () => {
    const expanded = expandIngredients([])
    expect(expanded.length).toBe(0)
  })

  test('expandIngredients 去除空白', () => {
    const expanded = expandIngredients(['  ', ''])
    expect(expanded.length).toBe(0)
  })

  test('getAllCanonicalNames 返回非空数组', () => {
    const names = getAllCanonicalNames()
    expect(Array.isArray(names)).toBe(true)
    expect(names.length).toBeGreaterThan(20)
    expect(names).toContain('番茄')
    expect(names).toContain('土豆')
  })

  test('getHotIngredients 返回前20个', () => {
    const hot = getHotIngredients(20)
    expect(hot.length).toBe(20)
    expect(hot).toContain('鸡蛋')
  })
})