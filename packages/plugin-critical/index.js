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
    const { outDir } = this.config
    const { paths, ...options } = this.options

    const files = await glob(paths, { cwd: outDir })

    console.log(`Extract critical CSS (${files.length} pages)`)

    await Promise.all(files.map(file => {
      return critical.generate({
        ...options,
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
