const fs = require('fs-extra')
const critical = require('critical')
const micromatch = require('micromatch')
const { inlineCriticalCSS } = require('./lib/inline')

class CriticalPlugin {
  static defaultOptions () {
    return {
      paths: ['/'],
      ignore: undefined,
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
    const { outDir: base, baseUrl } = this.config
    const { paths, ...options } = this.options

    const pages = queue.filter(page => {
      return micromatch(page.path, paths).length
    })

    console.log(`Extract critical CSS (${pages.length} pages)`)

    await Promise.all(pages.map(async page => {
      const filePath = `${page.output}/index.html`
      const sourceHTML = await fs.readFile(filePath, 'utf-8')
      let criticalCSS = ''

      try {
        criticalCSS = await critical.generate({
          ignore: options.ignore,
          width: options.width,
          height: options.height,
          pathPrefix: baseUrl,
          html: sourceHTML,
          inline: false,
          minify: true,
          base
        })
      } catch (err) {
        console.log(err.message)
        return
      }

      // remove path prefix from hashed urls
      criticalCSS = criticalCSS.replace(/="url\([/\w]+%23(\w+)\)"/g, '="url(%23$1)"')

      // we manually inline critical css because cheerio is messing
      // up the markup from Vue server renderer
      const resultHTML = await inlineCriticalCSS(filePath, criticalCSS)

      return fs.outputFile(filePath, resultHTML)
    }))
  }
}

module.exports = CriticalPlugin
