const glob = require('globby')
const critical = require('critical')

class CriticalPlugin {
  static defaultOptions () {
    return {
      paths: ['index.html'],
      ignore: undefined,
      inline: true,
      width: 1300,
      height: 900
    }
  }

  constructor (options, { context, config }) {
    this.options = options
    this.context = context
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
        src: file,
        dest: file,
        inline: true,
        base,
        width,
        height,
        ignore
      })
    }))
  }
}

module.exports = CriticalPlugin
