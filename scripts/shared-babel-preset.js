const resolve = p => require.resolve(p)

module.exports = (context, options = {}) => {
  const { browser = false, debug = false } = options
  // const { NODE_ENV, BABEL_ENV } = process.env

  const env = {
    loose: true,
    useBuiltIns: 'entry',
    shippedProposals: true,
    modules: 'commonjs',
    targets: {
      node: 8.0
    }
  }

  if (browser) {
    env.useBuiltIns = false
    env.targets = {
      browsers: ['last 4 versions', 'safari >= 7', 'ie >= 9']
    }
  }

  return {
    presets: [
      [resolve('@babel/preset-env'), env]
    ],
    plugins: [
      resolve('@babel/plugin-transform-runtime')
    ]
  }
}
