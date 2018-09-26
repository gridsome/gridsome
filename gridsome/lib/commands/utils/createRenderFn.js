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
      const inject = context.meta ? context.meta.inject() : null

      const head = '' +
        (inject ? inject.title.text() : '') +
        (inject ? inject.meta.text() : '') +
        (inject ? inject.link.text() : '') +
        (inject ? inject.style.text() : '') +
        (inject ? inject.script.text() : '') +
        (inject ? inject.noscript.text() : '') +
        context.renderResourceHints() +
        context.renderStyles()

      const htmlAttrs = inject ? inject.htmlAttrs.text() : ''
      const bodyAttrs = inject ? inject.bodyAttrs.text() : ''

      return renderHTML({
        htmlAttrs: inject ? `data-html-server-rendered="true" ${htmlAttrs}` : '',
        scripts: context.renderScripts(),
        bodyAttrs,
        head,
        app
      })
    } catch (err) {
      throw err
    }
  }
}
