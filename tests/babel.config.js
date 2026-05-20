/**
 * babel.config.js — 前端测试 JS 转换配置
 * 用于 babel-jest 转换 frontend/*.js 文件
 */
'use strict'

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]
  ],
  plugins: [
    // 内联插件：将 Vite 的 import.meta.env 转译为 process.env（测试环境兼容）
    function importMetaEnv({ types: t }) {
      return {
        visitor: {
          MetaProperty(path) {
            const { meta, property } = path.node
            if (meta.name === 'import' && property.name === 'meta') {
              const parent = path.parentPath
              if (parent && parent.isMemberExpression() && t.isIdentifier(parent.node.property, { name: 'env' })) {
                parent.replaceWith(t.memberExpression(t.identifier('process'), t.identifier('env')))
              } else {
                path.replaceWith(t.objectExpression([]))
              }
            }
          }
        }
      }
    }
  ]
}
