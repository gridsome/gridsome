const fs = require('fs-extra')
const critical = require('critical')
const micromatch = require('micromatch')

const {
  createPolyfillScript,
  inlineCriticalCSS
} = require('./lib/inline')

class CriticalPlugin {
  static defaultOptions () {
    return {
      paths: ['/'],
      ignore: undefined,
      polyfill: true,
      width: 1300,
      height: 900
    }
  }

  constructor (options, { config }) {
    this.options = options
    this.config = config
  }

  apply () {}

  async afterBuild ({ queue }) {
    const { outDir: base, pathPrefix } = this.config
    const { paths, ...options } = this.options

    const pages = queue.filter(page => {
      return micromatch(page.path, paths).length
    })

    console.log(`Extract critical CSS (${pages.length} pages)`)

    await Promise.all(pages.map(async ({ htmlOutput }) => {
      const sourceHTML = await fs.readFile(htmlOutput, 'utf-8')
      let polyfill = ''
      let css = ''

      try {
        css = await critical.generate({
          ignore: options.ignore,
          width: options.width,
          height: options.height,
          html: sourceHTML,
          inline: false,
          minify: true,
          pathPrefix,
          base
        })
      } catch (err) {
        console.log(err.message)
        return
      }

      // remove path prefix from hashed urls
      css = css.replace(/="url\([/\w]+%23(\w+)\)"/g, '="url(%23$1)"')

      if (options.polyfill) {
        polyfill = createPolyfillScript()
      }

      // we manually inline critical css because cheerio is messing
      // up the markup from Vue server renderer
      const resultHTML = await inlineCriticalCSS(htmlOutput, { css, polyfill })

      return fs.outputFile(htmlOutput, resultHTML)
    }))
  }
}

module.exports = CriticalPlugin
