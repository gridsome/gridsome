// require('v8-compile-cache')
// jest-worker

const Service = require('../Service')
const { done } = require('@vue/cli-shared-utils')

module.exports = async function (api) {
  // 1. render all pages from the filesystem plugin
  // 2. render archive pages
  // 3. render single pages

  api.registerCommand('build', async (args, rawArgv) => {
    const service = new Service(api)

    await service.bootstrap()

    // const createClientConfig = require('../config/client')
    // const createServerConfig = require('../config/server')
    // const chainableClientConfig = api.resolveChainableWebpackConfig()
    // const chainableServerConfig = api.resolveChainableWebpackConfig()
    // const { createBundleRenderer } = require('vue-server-renderer')

    // createClientConfig(chainableClientConfig)
    // createServerConfig(chainableServerConfig)

    // const outDir = `${api.service.context}/public`
    // const createClientConfig = require('./misc/webpack-client')
    // const createServerConfig = require('./misc/webpack-server')
    // const { createBundleRenderer } = require('vue-server-renderer')

    // // initialize app
    // process.gridsome = new Gridsome()

    // await require('./misc/resolve-styles')(api)
    // await fs.remove(outDir)

    // let clientConfig = api.service.resolveWebpackConfig(createClientConfig, { isServer: false })
    // let serverConfig = api.service.resolveWebpackConfig(createServerConfig, { isServer: true })

    // const stats = await compile([clientConfig, serverConfig])
    // const clientManifest = require(path.resolve(outDir, 'manifest/client.json'))
    // const serverBundle = require(path.resolve(outDir, 'manifest/server.json'))

    // // remove manifests after loading them.
    // await fs.remove(`${outDir}/manifest`)

    // const renderer = createBundleRenderer(serverBundle, {
    //   clientManifest,
    //   inject: false,
    //   runInNewContext: false,
    //   template: await fs.readFile(require.resolve('../../app/index.ssr.html'), 'utf-8'),
    //   directives: {
    //     attachment (vnode, dir) {
    //       const value = dir.value.id
    //       const style = vnode.data.style || (vnode.data.style = {})
    //       const domProps = vnode.data.domProps || (vnode.data.domProps = {})

    //       if (vnode.tag === 'img') {
    //         domProps.src = Vue.util.assetUrl(value)
    //       } else {
    //         style.backgroundImage = `url(${Vue.util.assetUrl(value)})`
    //       }
    //     },
    //     editable (vnode, dir) {
    //       vnode.data.domProps = {
    //         innerHTML: dir.value.value
    //       }
    //     }
    //   }
    // })

    // for (let node of service.nodes.page) {
    //   try { await render(node, outDir, renderer) }
    //   catch (err) { console.error(err)}
    // }

    // await require('workbox-build').generateSW({
    //   globDirectory: outDir,
    //   swDest: path.resolve(outDir, 'service-worker.js'),
    //   globPatterns: ['**\/*.{js,css,html,png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,otf}']
    // })

    done('Generation complete 🎉\n')
  })
}

async function render ({ attributes }, outDir, renderer) {
  const fs = require('fs-extra')
  const path = require('path')

  // TODO: implement vue-meta ssr rendering
  // https://github.com/declandewet/vue-meta#simple-rendering-with-rendertostring

  const context = {
    url: attributes.path,
    title: `${attributes.title} | Gridsome`,
    lang: 'en'
  }

  try {
    // TODO: beforeRender(attributes, context)
    const html = await renderer.renderToString(context)
    const filename = attributes.path.replace(/\/?$/, '/index.html').replace(/^\//, '')
    const filePath = path.resolve(outDir, filename)
    // TODO: beforeWrite(attributes, context, filePath, html)
    await fs.ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, html)
  } catch (err) {
    throw err
  }
}

function compile (config) {
  return new Promise((resolve, reject) => {
    require('webpack')(config, (err, stats) => {
      if (err) return reject(err)

      if (stats.hasErrors()) {
        stats.toJson().errors.forEach((err) => {
          console.error(err)
        })
        return reject(new Error('Failed to compile with errors.'))
      }

      resolve(stats.toJson({ modules: false }))
    })
  })
}
