const chalk = require('chalk')
const { parse } = require('node-html-parser')
const createHTMLRenderer = require('./createHTMLRenderer')
const { createBundleRenderer } = require('./bundleRenderer')
const { error } = require('../utils/log')

const MAX_STATE_SIZE = 25000

module.exports = function createRenderFn ({
  htmlTemplate,
  clientManifestPath,
  serverBundlePath,
  shouldPrefetch,
  shouldPreload
}) {
  const bundle = require(serverBundlePath)
  const clientManifest = require(clientManifestPath)
  const renderContext = createBundleRenderer(bundle, {
    clientManifest,
    shouldPrefetch,
    shouldPreload
  })

  return async function renderPage(page, state, stateSize, hash) {
    const ssrContext = {
      path: page.path,
      location: page.location,
      state: createState(state)
    }

    let result

    try {
      result = await renderContext(ssrContext)
    } catch (err) {
      const location = page.location.name || page.location.path
      error(chalk.red(`Could not generate HTML for "${location}":`))
      throw err
    }

    // Inserts Teleports to the HTML template.
    if (ssrContext.teleports) {
      const template = parse(htmlTemplate)

      for (const selector in ssrContext.teleports) {
        const target = template.querySelector(selector)
        const value = ssrContext.teleports[selector]

        if (target && target.childNodes) {
          target.childNodes.push(value)
        } else {
          const location = page.location.name || page.location.path
          error(chalk.red(`Could not generate HTML for "${location}":`))
          throw new Error(`Failed to locate Teleport target with selector "${selector}".`)
        }
      }

      htmlTemplate = template.toString()
    }

    const renderHTML = createHTMLRenderer(htmlTemplate)

    // const inject = ssrContext.meta.inject()
    // const htmlAttrs = inject.htmlAttrs.text()
    // const bodyAttrs = inject.bodyAttrs.text()

    // const pageTitle = inject.title.text()
    // const metaBase = inject.base.text()
    const gridsomeHash = `<meta name="gridsome:hash" content="${hash}">`
    // const vueMetaTags = inject.meta.text()
    // const vueMetaLinks = inject.link.text()
    const styles = result.renderStyles()
    // const noscript = inject.noscript.text()
    // const vueMetaStyles = inject.style.text()
    // const vueMetaScripts = inject.script.text()
    const resourceHints = result.renderResourceHints()

    const head =
      '' +
      // pageTitle +
      // metaBase +
      gridsomeHash +
      // vueMetaTags +
      // vueMetaLinks +
      resourceHints +
      styles
      // vueMetaStyles +
      // vueMetaScripts +
      // noscript

    const renderedState =
      state && stateSize <= MAX_STATE_SIZE
        ? result.renderState()
        : ''

    const scripts = '' +
      renderedState +
      result.renderScripts()
      // inject.script.text({ body: true })

    return renderHTML({
      // htmlAttrs: `data-html-server-rendered="true" ${htmlAttrs}`,
      // bodyAttrs,
      head,
      // title: pageTitle,
      // base: metaBase,
      hash: gridsomeHash,
      // vueMetaTags,
      // vueMetaLinks,
      resourceHints,
      styles,
      // vueMetaStyles,
      // vueMetaScripts,
      // noscript,
      app: result.html,
      scripts
    })
  }
}

function createState (state = {}) {
  return {
    data: state.data || null,
    context: state.context || {}
  }
}
