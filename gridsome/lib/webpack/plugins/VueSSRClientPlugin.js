const hash = require('hash-sum')
const { uniq } = require('lodash')

const isJSRegExp = /\.js(\?[^.]+)?$/
const isJS = file => isJSRegExp.test(file)
const isCSS = file => /\.css(\?[^.]+)?$/.test(file)
const isStyleChunk = file => /styles(\.\w{8})?\.js$/.test(file)

class VueSSRClientPlugin {
  constructor(options) {
    this.options = options
  }

  apply(compiler) {
    compiler.hooks.emit.tapAsync('vue-client-plugin', (compilation, callback) => {
      const stats = compilation.getStats().toJson()

      const allFiles = uniq(
        stats.assets
          .map(a => a.name))
          // Avoid preloading / injecting the style chunk
          .filter(file => !isStyleChunk(file)
      )

      const initialFiles = uniq(
        Object.keys(stats.entrypoints)
          .map(name => stats.entrypoints[name].assets)
          .reduce((assets, all) => all.concat(assets), [])
          .filter(file => isJS(file) || isCSS(file)))
          // Avoid preloading / injecting the style chunk
          .filter(file => !isStyleChunk(file)
      )

      const asyncFiles = allFiles
        .filter(file => isJS(file) || isCSS(file))
        .filter(file => !initialFiles.includes(file))

      const assetsMapping = {}

      stats.assets
        .filter(({ name }) => isJS(name))
        .forEach(({ name, chunkNames }) => {
          const componentHash = hash(chunkNames.join('|'))
          if (!assetsMapping[componentHash]) {
            assetsMapping[componentHash] = []
          }
          assetsMapping[componentHash].push(name)
        })

      const manifest = {
        publicPath: stats.publicPath,
        all: allFiles,
        initial: initialFiles,
        async: asyncFiles,
        assetsMapping,
        modules: {}
      }

      const { entrypoints, namedChunkGroups } = stats
      const assetModules = stats.modules.filter(m => m.assets.length)
      const fileToIndex = file => manifest.all.indexOf(file)

      stats.modules.forEach((m) => {
        // Ignore modules duplicated in multiple chunks
        if (m.chunks.length === 1) {
          const [cid] = m.chunks
          const chunk = stats.chunks.find(c => c.id === cid)
          if (!chunk || !chunk.files) {
            return
          }
          const id = m.identifier.replace(/\s\w+$/, '') // remove appended hash
          const filesSet = new Set(chunk.files.map(fileToIndex))

          for (const chunkName of chunk.names) {
            if (!entrypoints[chunkName]) {
              const chunkGroup = namedChunkGroups[chunkName]
              if (chunkGroup) {
                for (const asset of chunkGroup.assets) {
                  filesSet.add(fileToIndex(asset))
                }
              }
            }
          }

          const files = Array.from(filesSet)
          manifest.modules[hash(id)] = files

          // In production mode, modules may be concatenated by scope hoisting
          // Include ConcatenatedModule for not losing module-component mapping.
          if (Array.isArray(m.modules)) {
            for (const concatenatedModule of m.modules) {
              const id = hash(concatenatedModule.identifier.replace(/\s\w+$/, ''))
              if (!manifest.modules[id]) {
                manifest.modules[id] = files
              }
            }
          }

          // Find all asset modules associated with the same chunk.
          assetModules.forEach((m) => {
            if (m.chunks.some(id => id === cid)) {
              files.push.apply(files, m.assets.map(fileToIndex))
            }
          })
        }
      })

      const src = JSON.stringify(manifest, null, 2)

      compilation.assets[this.options.filename] = {
        source: () => src,
        size: () => src.length
      }

      callback()
    })
  }
}

module.exports = VueSSRClientPlugin
