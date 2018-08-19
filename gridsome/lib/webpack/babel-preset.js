module.exports = (context, options = {}) => {
  const presets = []
  const plugins = []
  const env = {}

  // node (env.targets: { node: 'current' })
  // modern (env.targets: { esmodules: true })

  presets.push([require.resolve('@babel/preset-env'), env])

  plugins.push(require.resolve('@babel/plugin-syntax-dynamic-import'))
  plugins.push(require.resolve('@babel/plugin-transform-runtime'))

  return {
    presets,
    plugins
  }
}
