/**
 * JS Transform Wrapper — 使用 @babel/core 直接转译
 * 避免 babel-jest 在 Jest 29 下的配置解析问题
 */
const babel = require('@babel/core')

const BABEL_OPTS = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]
  ],
  plugins: [
    // 内联插件：将 Vite 的 import.meta.env 转译为 process.env
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
  ],
  configFile: false,
  babelrc: false
}

module.exports = {
  process(src, filename) {
    const result = babel.transformSync(src, { ...BABEL_OPTS, filename })
    return { code: result.code, map: result.map }
  }
}
