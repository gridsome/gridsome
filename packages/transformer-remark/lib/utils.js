const vfile = require('vfile')
const hash = require('hash-sum')
const visit = require('unist-util-visit')

exports.cacheKey = function (node, key) {
  return hash({
    content: node.content,
    path: node.internal.origin,
    timestamp: node.internal.timestamp,
    key
  })
}

exports.createFile = function (node) {
  return vfile({
    contents: node.content,
    path: node.internal.origin,
    data: { node }
  })
}

exports.createPlugins = function (options, localOptions) {
  const userPlugins = (options.plugins || []).concat(localOptions.plugins || [])
  const plugins = []

  if (options.useBuiltIns === false) {
    return normalizePlugins(userPlugins || [])
  }

  if (options.processFiles !== false) {
    plugins.push(require('./plugins/file'))
  }

  if (options.processImages !== false) {
    plugins.push([require('./plugins/image'), {
      blur: options.imageBlurRatio,
      quality: options.imageQuality,
      background: options.imageBackground,
      immediate: options.lazyLoadImages === false ? true : undefined
    }])
  }

  if (options.slug !== false) {
    plugins.push('remark-slug')
  }

  if (options.fixGuillemets !== false) {
    plugins.push('remark-fix-guillemets')
  }

  if (options.squeezeParagraphs !== false) {
    plugins.push('remark-squeeze-paragraphs')
  }

  if (options.externalLinks !== false) {
    plugins.push(['remark-external-links', {
      target: options.externalLinksTarget,
      rel: options.externalLinksRel
    }])
  }

  if (options.autolinkHeadings !== false && options.slug !== false) {
    plugins.push(['remark-autolink-headings', {
      content: {
        type: 'element',
        tagName: 'span',
        properties: {
          className: options.autolinkClassName || 'icon icon-link'
        }
      },
      linkProperties: {
        'aria-hidden': 'true'
      },
      ...options.autolinkHeadings
    }])
  }

  plugins.push(...userPlugins)

  return normalizePlugins(plugins)
}

exports.findHeadings = function (ast) {
  const headings = []

  visit(ast, 'heading', node => {
    const heading = { depth: node.depth, value: '', anchor: '' }
    const children = node.children || []

    for (let i = 0, l = children.length; i < l; i++) {
      const el = children[i]

      if (el.type === 'link') {
        heading.anchor = el.url
      } else if (el.value) {
        heading.value += el.value
      }
    }

    headings.push(heading)
  })

  return headings
}

function normalizePlugins (arr = []) {
  const normalize = entry => {
    return typeof entry === 'string'
      ? require(entry)
      : entry
  }

  return arr.map(entry => {
    return Array.isArray(entry)
      ? [normalize(entry[0]), entry[1] || {}]
      : [normalize(entry), {}]
  })
}
