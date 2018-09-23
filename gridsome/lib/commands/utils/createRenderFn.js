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
    inject: false,
    runInNewContext: false,
    clientManifest
  })

  return async function render (url, data = {}) {
    const context = { url, pageQuery: { data }}

    try {
      const app = await renderer.renderToString(context)
      const inject = context.head.inject()

      const head = '' +
        inject.title.text() +
        inject.meta.text() +
        inject.link.text() +
        inject.style.text() +
        inject.script.text() +
        inject.noscript.text() +
        context.renderResourceHints() +
        context.renderStyles()

      return renderHTML({
        htmlAttrs: `data-html-server-rendered="true" ${inject.htmlAttrs.text()}`,
        bodyAttrs: inject.bodyAttrs.text(),
        scripts: context.renderScripts(),
        head,
        app
      })
    } catch (err) {
      throw err
    }
  }
}
