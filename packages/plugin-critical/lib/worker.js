const fs = require('fs-extra')
const oust = require('oust')
const critical = require('critical')
const { createPolyfillScript, inlineCriticalCSS } = require('./inline')

exports.processHtmlFile = async function (filename, options = {}) {
  const { publicPath, baseDir, polyfill, ...criticalOptions } = options
  const sourceHTML = await fs.readFile(filename, 'utf-8')

  // Extract stylesheet paths manually to prevent duplicate CSS.
  let stylesheets = oust.raw(sourceHTML, 'stylesheets')
    .filter((link) => link.$el.attr('media') !== 'print' && Boolean(link.value))
    .map((link) => link.value)
    .filter((href, i, arr) => arr.indexOf(href) === i)

  if (publicPath !== '/') {
    // Replace `publicPath` to help `critical` find the stylesheets.
    const re = new RegExp(`^${publicPath}`)
    stylesheets = stylesheets.map(stylesheet => {
      return stylesheet.replace(re, '/')
    })
  }

  const result = await critical.generate({
    ...criticalOptions,
    base: baseDir,
    html: sourceHTML,
    css: stylesheets,
    inline: false,
    ignore: {
      atrule: ['@font-face'],
      decl: (node, value) => /url\(/.test(value),
      ...criticalOptions.ignore
    }
  })

  // Remove `publicPath` from hashed URLs.
  const css = result.css.replace(/="url\([/\w]+%23(\w+)\)"/g, '="url(%23$1)"')
  const polyfillSrc = polyfill ? createPolyfillScript() : ''

  // Manually inline critical CSS to original HTML to keep the `publicPath`
  // in href attributes and inject a polyfill for .
  return inlineCriticalCSS(filename, { css, polyfill: polyfillSrc })
}
