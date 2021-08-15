const webpack = require('webpack')

const isJS = file => /\.js(\?[^.]+)?$/.test(file)
const getAssetName = asset => typeof asset === 'string' ? asset : asset.name

class VueSSRServerPlugin {
  constructor (options = {}) {
    this.options = Object.assign({
      filename: 'vue-ssr-server-bundle.json'
    }, options)
  }

  apply (compiler) {
    const name = 'vue-server-plugin'

    compiler.hooks.compilation.tap(name, (compilation) => {
      if (compilation.compiler !== compiler) {
        return
      }

      const stage = webpack.Compilation['PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER']

      compilation.hooks.processAssets.tapAsync({ name, stage }, (assets, cb) => {
        const stats = compilation.getStats().toJson()
        const entryName = Object.keys(stats.entrypoints)[0]
        const entryInfo = stats.entrypoints[entryName]

        if (!entryInfo) {
          // #5553
          return cb()
        }

        const entryAssets = entryInfo.assets
          .map(getAssetName)
          .filter(isJS)

        if (entryAssets.length > 1) {
          throw new Error(
            `Server-side bundle should have one single entry file. ` +
            `Avoid using CommonsChunkPlugin in the server config.`
          )
        }

        const bundle = {
          entry: entryAssets[0],
          files: {},
          maps: {}
        }

        Object.keys(compilation.assets).forEach(name => {
          if (isJS(name)) {
            bundle.files[name] = compilation.assets[name].source()
          } else if (name.match(/\.js\.map$/)) {
            bundle.maps[name.replace(/\.map$/, '')] = JSON.parse(compilation.assets[name].source())
          }
          // do not emit anything else for server
          delete compilation.assets[name]
        })

        const json = JSON.stringify(bundle, null, 2)
        const filename = this.options.filename

        compilation.assets[filename] = {
          source: () => json,
          size: () => json.length
        }

        cb()
      })
    })
  }
}

module.exports = VueSSRServerPlugin
