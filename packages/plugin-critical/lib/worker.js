const fs = require('fs-extra')
const critical = require('critical')

const {
  createPolyfillScript,
  inlineCriticalCSS
} = require('./inline')

exports.generate = async function (htmlOutput, options = {}) {
  const sourceHTML = await fs.readFile(htmlOutput, 'utf-8')

  let css = await critical.generate({
    ignore: options.ignore,
    width: options.width,
    height: options.height,
    pathPrefix: options.pathPrefix,
    html: sourceHTML,
    inline: false,
    minify: true,
    base: options.base
  })

  // remove path prefix from hashed urls
  css = css.replace(/="url\([/\w]+%23(\w+)\)"/g, '="url(%23$1)"')

  let polyfill = ''

  if (options.polyfill) {
    polyfill = createPolyfillScript()
  }

  // we manually inline critical css because cheerio is messing
  // up the markup from Vue server renderer
  const resultHTML = await inlineCriticalCSS(htmlOutput, { css, polyfill })

  await fs.outputFile(htmlOutput, resultHTML)
}
