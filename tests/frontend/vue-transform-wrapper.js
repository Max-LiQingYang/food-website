/**
 * Vue Jest Transform Wrapper — 二次转译 ESM → CJS
 */
const vueJest = require('@vue/vue3-jest')
const babel = require('@babel/core')

const BABEL_OPTS = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]
  ],
  plugins: [],
  configFile: false,
  babelrc: false
}

module.exports = {
  process(src, filename, config) {
    const result = vueJest.process(src, filename, config)
    const babelResult = babel.transformSync(result.code, {
      ...BABEL_OPTS,
      filename
    })
    return { code: babelResult.code, map: babelResult.map }
  },
  getCacheKey(src, filename, config) {
    return vueJest.getCacheKey(src, filename, config)
  }
}
