'use strict'

/**
 * custom-vue-transformer.js
 * 直接使用 @vue/vue3-jest 的 transform
 * 只需修复 import.meta.env 问题
 */
const vue3Jest = require('@vue/vue3-jest')

const originalTransformer = vue3Jest

module.exports = {
  process(src, filename, config) {
    if (!filename.endsWith('.vue')) {
      return src
    }
    // 直接委托给 @vue/vue3-jest
    // 它会处理 template + script 的编译
    return originalTransformer.process(src, filename, config)
  }
}
