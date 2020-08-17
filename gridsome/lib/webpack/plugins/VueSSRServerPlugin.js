const isJSRegExp = /\.js(\?[^.]+)?$/
const isJS = file => isJSRegExp.test(file)

class VueSSRServerPlugin {
  constructor(options) {
    this.options = options
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('vue-server-plugin', (compilation, callback) => {
      const stats = compilation.getStats().toJson()
      const [entryName] = Object.keys(stats.entrypoints)
      const entryInfo = stats.entrypoints[entryName]
      const entryAssets = entryInfo.assets.filter(file => isJSRegExp.test(file))

      if (entryAssets.length !== 1) {
        throw new Error(
          'Server-side bundle should have one single entry file. ' +
          'Avoid using CommonsChunkPlugin in the server config.'
        )
      }

      const bundle = {
        entry: entryAssets[0],
        files: {},
        maps: {}
      }

      stats.assets.forEach((asset) => {
        if (isJS(asset.name)) {
          bundle.files[asset.name] = compilation.assets[asset.name].source()
        } else if (asset.name.match(/\.js\.map$/)) {
          bundle.maps[asset.name.replace(/\.map$/, '')] = JSON.parse(compilation.assets[asset.name].source())
        }
        // Do not emit anything else for server.
        delete compilation.assets[asset.name]
      })

      const src = JSON.stringify(bundle, null, 2)

      compilation.assets[this.options.filename] = {
        source: () => src,
        size: () => src.length
      }

      callback()
    })
  }
}

module.exports = VueSSRServerPlugin
