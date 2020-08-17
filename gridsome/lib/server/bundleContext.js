const path = require('path')
const serialize = require('serialize-javascript')

function isJS(file) {
  return /\.js(\?[^.]+)?$/.test(file)
}

function isCSS(file) {
  return /\.css(\?[^.]+)?$/.test(file)
}

function mapIdToFile (id, clientManifest) {
  const files = []
  const fileIndices = clientManifest.modules[id]
  if (fileIndices) {
    fileIndices.forEach(index => {
      const file = clientManifest.all[index]
      // only include async files or non-js assets
      if (clientManifest.async.indexOf(file) > -1 || !(/\.js($|\?)/.test(file))) {
        files.push(file)
      }
    })
  }
  return files
}

function createMap (clientManifest) {
  const map = new Map()
  Object.keys(clientManifest.modules).forEach(id => {
    map.set(id, mapIdToFile(id, clientManifest))
  })
  return map
}

function createMapper(clientManifest) {
  const map = createMap(clientManifest)
  // map server-side moduleIds to client-side files
  return function mapper (moduleIds) {
    const res = new Set()
    for (let i = 0; i < moduleIds.length; i++) {
      const mapped = map.get(moduleIds[i])
      if (mapped) {
        for (let j = 0; j < mapped.length; j++) {
          res.add(mapped[j])
        }
      }
    }
    return Array.from(res)
  }
}

function getPreloadType (ext) {
  if (ext === 'js') {
    return 'script'
  } else if (ext === 'css') {
    return 'style'
  } else if (/jpe?g|png|svg|gif|webp|ico/.test(ext)) {
    return 'image'
  } else if (/woff2?|ttf|otf|eot/.test(ext)) {
    return 'font'
  } else {
    // not exhausting all possibilities here, but above covers common cases
    return ''
  }
}

function normalizeFile (file) {
  const withoutQuery = file.replace(/\?.*/, '')
  const extension = path.extname(withoutQuery).slice(1)

  return {
    file,
    extension,
    fileWithoutQuery: withoutQuery,
    asType: getPreloadType(extension)
  }
}

exports.createBundleContext = ({ clientManifest, shouldPrefetch, shouldPreload }) => {
  const preloadFiles = (clientManifest.initial || []).map(normalizeFile)
  const prefetchFiles = (clientManifest.async || []).map(normalizeFile)
  const mapFiles = createMapper(clientManifest)
  const { publicPath } = clientManifest

  let asyncFilesCache

  function getUsedAsyncFiles (ssrContext) {
    if (!asyncFilesCache && ssrContext._registeredComponents) {
      const registered = Array.from(ssrContext._registeredComponents)
      asyncFilesCache = mapFiles(registered).map(normalizeFile)
    }

    return asyncFilesCache || []
  }

  function getPreloadFiles (ssrContext) {
    const usedAsyncFiles = getUsedAsyncFiles(ssrContext)
    if (preloadFiles || usedAsyncFiles) {
      return preloadFiles.concat(usedAsyncFiles)
    } else {
      return []
    }
  }

  function renderPreloadLinks(ssrContext) {
    const files = getPreloadFiles(ssrContext)

    return files
      .map(({ file, extension, fileWithoutQuery, asType }) => {
        if (
          (!shouldPreload && asType !== 'script' && asType !== 'style') ||
          (shouldPreload && !shouldPreload(fileWithoutQuery, asType))
        ) {
          return ''
        }

        let attrs = ''

        if (asType !== '') {
          attrs += ` as="${asType}"`
          if (asType === 'font') {
            attrs += ` type="font/${extension}" crossorigin`
          }
        }

        return `<link rel="preload" href="${publicPath}${file}"${attrs}>`
      })
      .join('')
  }

  function renderPrefetchLinks(ssrContext) {
    const usedAsyncFiles = getUsedAsyncFiles(ssrContext)
    const alreadyRendered = file => usedAsyncFiles.some(f => f.file === file)

    return prefetchFiles
      .map(({ file, fileWithoutQuery, asType }) => {
        if (shouldPrefetch && !shouldPrefetch(fileWithoutQuery, asType)) {
          return ''
        }
        if (alreadyRendered(file)) {
          return ''
        }
        return `<link rel="prefetch" href="${publicPath}${file}">`
      })
      .join('')
  }

  function renderResourceHints(ssrContext) {
    return renderPreloadLinks(ssrContext) + renderPrefetchLinks(ssrContext)
  }

  function renderStyles(ssrContext) {
    const async = getUsedAsyncFiles(ssrContext)
    const links = preloadFiles
      .concat(async).filter(({ file }) => isCSS(file))
      .map(({ file }) => `<link rel="stylesheet" href="${publicPath}${file}">`).join('')

    // ssrContext.styles is a getter exposed by `vue-style-loader` which
    // contains the inline component styles collected during SSR.
    const vueStyleLoaderStyles = ssrContext.styles || ''

    return links + vueStyleLoaderStyles
  }

  function renderScripts(ssrContext) {
    const initial = preloadFiles.filter(({ file }) => isJS(file))
    const async = getUsedAsyncFiles(ssrContext).filter(({ file }) => isJS(file))
    const needed = [initial[0]].concat(async, initial.slice(1))

    return needed
      .map(({ file }) => `<script src="${publicPath}${file}" defer></script>`)
      .join('')
  }

  function renderState(ssrContext) {
    const name = '__INITIAL_STATE__'
    const state = serialize(ssrContext.state)
    const nonceAttr = ssrContext.nonce ? ` nonce="${ssrContext.nonce}"` : ''

    return `<script${nonceAttr}>window.${name}=${state}</script>`
  }

  return {
    renderResourceHints,
    renderStyles,
    renderScripts,
    renderState
  }
}
