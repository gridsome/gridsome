const critical = require('critical')
const micromatch = require('micromatch')

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

  async afterBuild () {
    const { outDir } = this.config
    const { paths, ...options } = this.options

    const pages = queue.filter(page => {
      return micromatch(page.path, paths).length
    })

    console.log(`Extract critical CSS (${pages.length} pages)`)

      return critical.generate({
        ...options,
    await Promise.all(pages.map(async page => {
        minify: true,
        inline: true,
        base: outDir,
        src: file,
        dest: file
      })
    }))
  }
}

module.exports = CriticalPlugin
