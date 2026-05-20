'use strict'

// 自定义 Babel 插件：处理 Vite 的 import.meta.env
function viteImportMetaEnvPlugin() {
  return {
    visitor: {
      MemberExpression(path, state) {
        if (
          path.get('object').isMemberExpression() &&
          path.get('object.object').isMetaProperty() &&
          path.get('object.property').isIdentifier({ name: 'env' })
        ) {
          // import.meta.env.VAR → process.env.VAR
          const varName = path.get('property').node.name
          path.replaceWith(
            state.builder ||
            require('@babel/types').memberExpression(
              require('@babel/types').identifier('process'),
              require('@babel/types').identifier(varName)
            )
          )
          path.skip()
        }
      }
    }
  }
}

module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: 'current' },
      modules: 'commonjs'
    }]
  ],
  plugins: [viteImportMetaEnvPlugin]
}
