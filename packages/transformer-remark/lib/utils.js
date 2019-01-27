const visit = require('unist-util-visit')
const imagePlugin = require('./plugins/image')

exports.createFile = function (options) {
  const file = {
    contents: options.contents
  }

  if (options.path) file.path = options.path
  if (options.data) file.data = options.data

  return file
}

exports.normalizePlugins = function (arr = []) {
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

exports.createPlugins = function (options, userPlugins) {
  const plugins = []

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

  if (options.autolinkHeadings !== false) {
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

  plugins.push(imagePlugin)
  plugins.push(...userPlugins)

  return exports.normalizePlugins(plugins)
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
