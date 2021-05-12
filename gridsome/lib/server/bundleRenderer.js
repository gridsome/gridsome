const { SourceMapConsumer } = require('source-map')
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
    let app, html

    // TODO: Check if this will be used in next version of `vue-loader`.
    ssrContext._registeredComponents = new Set()
    ssrContext.meta = {}

    try {
      app = await runBundle(ssrContext)
      html = await renderToString(app, ssrContext)

      const metaContext = { teleports: {} }
      const components = app.config.globalProperties.$metaManager.render()
      await Promise.all(components.map((component) => renderToString(component, metaContext)))

      for (const key in metaContext.teleports) {
        const value = metaContext.teleports[key]
        ssrContext.meta[key] = key.endsWith('Attrs')
          ? value.slice(value.indexOf(' ') + 1, value.indexOf('>'))
          : value

        delete ssrContext.teleports[key]
      }
    } catch(err) {
      rewriteErrorTrace(err, maps)
      throw err
    }

    return {
      renderResourceHints: () => bundleContext.renderResourceHints(ssrContext),
      renderStyles: () => bundleContext.renderStyles(ssrContext),
      renderScripts: () => bundleContext.renderScripts(ssrContext),
      renderState: () => bundleContext.renderState(ssrContext),
      html
    }
  }
}
