const hash = require('hash-sum')
const webpack = require('webpack')
const { uniq } = require('lodash')

const isJS = file => /\.js(\?[^.]+)?$/.test(file)
const isCSS = file => /\.css(\?[^.]+)?$/.test(file)
const stripModuleIdHash = id => id.replace(/\|\w+$/, '')
const getAssetName = asset => typeof asset === 'string' ? asset : asset.name

class VueSSRClientPlugin {
  constructor (options = {}) {
    this.options = Object.assign({
      filename: 'vue-ssr-client-manifest.json'
    }, options)
  }

  apply (compiler) {
    const name = 'vue-client-plugin'

    compiler.hooks.compilation.tap(name, (compilation) => {
      if (compilation.compiler !== compiler) {
        return
      }

      const stage = webpack.Compilation['PROCESS_ASSETS_STAGE_ADDITIONAL']

      compilation.hooks.processAssets.tapAsync({ name, stage }, (assets, cb) => {
        const stats = compilation.getStats().toJson()

        const allFiles = uniq(stats.assets
          .map(a => a.name))

        const initialFiles = uniq(Object.keys(stats.entrypoints)
          .map(name => stats.entrypoints[name].assets)
          .reduce((assets, all) => all.concat(assets), [])
          .map(getAssetName)
          .filter((file) => isJS(file) || isCSS(file)))

        const asyncFiles = allFiles
          .filter((file) => isJS(file) || isCSS(file))
          .filter(file => initialFiles.indexOf(file) < 0)

        const manifest = {
          publicPath: stats.publicPath,
          all: allFiles,
          initial: initialFiles,
          async: asyncFiles,
          modules: { /* [identifier: string]: Array<index: number> */ }
        }

        const assetModules = stats.modules.filter(m => m.assets.length)
        const fileToIndex = asset => manifest.all.indexOf(getAssetName(asset))
        stats.modules.forEach(m => {
          // ignore modules duplicated in multiple chunks
          if (m.chunks.length === 1) {
            const cid = m.chunks[0]
            const chunk = stats.chunks.find(c => c.id === cid)
            if (!chunk || !chunk.files) {
              return
            }
            const id = stripModuleIdHash(m.identifier)
            const files = manifest.modules[hash(id)] = chunk.files.map(fileToIndex)
            // find all asset modules associated with the same chunk
            assetModules.forEach(m => {
              if (m.chunks.some(id => id === cid)) {
                files.push.apply(files, m.assets.map(fileToIndex))
              }
            })
          }
        })

        const json = JSON.stringify(manifest, null, 2)
        compilation.assets[this.options.filename] = {
          source: () => json,
          size: () => json.length
        }
        cb()
      })
    })
  }
}

module.exports = VueSSRClientPlugin
