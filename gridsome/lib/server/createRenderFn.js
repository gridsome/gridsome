const chalk = require('chalk')
const createHTMLRenderer = require('./createHTMLRenderer')
const { createBundleRenderer } = require('vue-server-renderer')
const { error } = require('../utils/log')

const MAX_STATE_SIZE = 25000

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

  return async function render(page, state, stateSize, hash) {
    const context = {
      path: page.path,
      location: page.location,
      state: createState(state)
    }

    let app = ''

    try {
      app = await renderer.renderToString(context)
    } catch (err) {
      const location = page.location.name || page.location.path
      error(chalk.red(`Could not generate HTML for "${location}":`))
      throw err
    }

    const inject = context.meta.inject()
    const htmlAttrs = inject.htmlAttrs.text()
    const bodyAttrs = inject.bodyAttrs.text()

    const head = '' +
      inject.title.text() +
      inject.base.text() +
      `<meta name="gridsome:hash" content="${hash}">` +
      inject.meta.text() +
      inject.link.text() +
      inject.style.text() +
      inject.script.text() +
      inject.noscript.text() +
      context.renderResourceHints() +
      context.renderStyles()

    const renderedState = state && stateSize <= MAX_STATE_SIZE
      ? context.renderState()
      : ''

    const scripts = '' +
      renderedState +
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

function createState (state = {}) {
  return {
    data: state.data || null,
    context: state.context || {}
  }
}
