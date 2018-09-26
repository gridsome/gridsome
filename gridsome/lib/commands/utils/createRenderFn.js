const chalk = require('chalk')
const { createHTMLRenderer } = require('../../utils/html')
const { createBundleRenderer } = require('vue-server-renderer')

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
    runInNewContext: false,
    shouldPrefetch (file, type) {
      return type === 'script' && !/js\/data(?:[^/]+)?\//.test(file)
    }
  })

  return async function render (url, data = {}) {
    const context = { url, pageQuery: { data }}
    let app = ''

    try {
      app = await renderer.renderToString(context)
    } catch (err) {
      console.error(chalk.red(`Failed to render ${url}`))
      throw err
    }

    const inject = context.meta.inject()

    const head = '' +
      inject.title.text() +
      inject.meta.text() +
      inject.link.text() +
      inject.style.text() +
      inject.script.text() +
      inject.noscript.text() +
      context.renderResourceHints() +
      context.renderStyles()

    const htmlAttrs = inject.htmlAttrs.text()
    const bodyAttrs = inject.bodyAttrs.text()

    return renderHTML({
      htmlAttrs: inject ? `data-html-server-rendered="true" ${htmlAttrs}` : '',
      scripts: context.renderScripts(),
      bodyAttrs,
      head,
      app
    })
  }
}
