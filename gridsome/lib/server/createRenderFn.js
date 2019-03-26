const chalk = require('chalk')
const createHTMLRenderer = require('./createHTMLRenderer')
const { createBundleRenderer } = require('vue-server-renderer')
const { error } = require('../utils/log')

module.exports = function createRenderFn ({
  htmlTemplate,
  clientManifestPath,
  serverBundlePath
}) {
  const renderHTML = createHTMLRenderer(htmlTemplate)
  const clientManifest = require(clientManifestPath)
  const serverBundle = require(serverBundlePath)

  const renderer = createBundleRenderer(serverBundle, {
    clientManifest,
    runInNewContext: false
  })

  return async function render (url, state = {}) {
    const context = { url, state }

    let app = ''

    try {
      app = await renderer.renderToString(context)
    } catch (err) {
      error(chalk.red(`Failed to render ${url}`))
      throw err
    }

    const inject = context.meta.inject()
    const htmlAttrs = inject.htmlAttrs.text()
    const bodyAttrs = inject.bodyAttrs.text()

    const head = '' +
      inject.title.text() +
      inject.base.text() +
      inject.meta.text() +
      inject.link.text() +
      inject.style.text() +
      inject.script.text() +
      inject.noscript.text() +
      context.renderResourceHints() +
      context.renderStyles()

    const scripts = '' +
      context.renderState() +
      context.renderScripts() +
      inject.script.text({ body: true })

    return renderHTML({
      htmlAttrs: `data-html-server-rendered="true" ${htmlAttrs}`,
      bodyAttrs,
      scripts,
      head,
      app
    })
  }
}
