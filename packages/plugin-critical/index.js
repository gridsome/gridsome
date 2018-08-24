const glob = require('globby')
const critical = require('critical')

class CriticalPlugin {
  static defaultOptions () {
    return {
      paths: ['index.html'],
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
    const { outDir: base } = this.config
    const { paths, width, height, ignore } = this.options

    const files = await glob(paths, { cwd: base })

    console.log(`Extract critical CSS (${files.length} pages)`)

    await Promise.all(files.map(file => {
      return critical.generate({
        minify: true,
        inline: true,
        src: file,
        dest: file,
        base,
        width,
        height,
        ignore
      })
    }))
  }
}

module.exports = CriticalPlugin
