const { SourceMapConsumer } = require('source-map')
const { renderHeadToString } = require('@vueuse/head')
const { renderToString } = require('@vue/server-renderer')
const { createBundleRunner } = require('./bundleRunner')
const { createBundleContext } = require('./bundleContext')

const filenameRE = /\(([^)]+\.js):(\d+):(\d+)\)$/

function rewriteTraceLine (trace, mapConsumers) {
  const m = trace.match(filenameRE)
  const map = m && mapConsumers[m[1]]
  if (m != null && map) {
    const originalPosition = map.originalPositionFor({
      line: Number(m[2]),
      column: Number(m[3])
    })
    if (originalPosition.source != null) {
      const { source, line, column } = originalPosition
      const mappedPosition = `(${source.replace(/^webpack:\/\/\//, '')}:${String(line)}:${String(column)})`
      return trace.replace(filenameRE, mappedPosition)
    } else {
      return trace
    }
  } else {
    return trace
  }
}

function createSourceMapConsumers(rawMaps) {
  const maps = {}
  Object.keys(rawMaps).forEach(file => {
    maps[file] = new SourceMapConsumer(rawMaps[file])
  })
  return maps
}

function rewriteErrorTrace(err, mapConsumers) {
  if (err && typeof err.stack === 'string') {
    err.stack = err.stack
      .split('\n')
      .map(line => rewriteTraceLine(line, mapConsumers))
      .join('\n')
  }
}

exports.createBundleRenderer = (bundle, options) => {
  const bundleContext = createBundleContext(options)
  const maps = createSourceMapConsumers(bundle.maps)
  const runBundle = createBundleRunner(bundle)

  return async function render(ssrContext) {
    // TODO: Check if this will be used in next version of `vue-loader`.
    ssrContext._registeredComponents = new Set()

    try {
      const { app, head } = await runBundle(ssrContext)
      const html = await renderToString(app, ssrContext)
      const { headTags, htmlAttrs, bodyAttrs } = renderHeadToString(head)

      return {
        renderResourceHints: () => bundleContext.renderResourceHints(ssrContext),
        renderStyles: () => bundleContext.renderStyles(ssrContext),
        renderScripts: () => bundleContext.renderScripts(ssrContext),
        renderState: () => bundleContext.renderState(ssrContext),
        headTags,
        htmlAttrs,
        bodyAttrs,
        html
      }
    } catch(err) {
      rewriteErrorTrace(err, maps)
      throw err
    }
  }
}
