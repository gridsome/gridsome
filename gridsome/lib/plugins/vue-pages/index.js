const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const chokidar = require('chokidar')

class VuePages {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    this.pages = api.pages
    this.store = api.store
    this.pagesDir = api.config.pagesDir

    if (fs.existsSync(this.pagesDir)) {
      api.createPages(args => this.createPages(args))
    }
  }

  createGraphQLRule (config, type, loader) {
    const re = new RegExp(`blockType=(${type})`)

    config.module.rule(type)
      .resourceQuery(re)
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        presets: [
          require.resolve('@vue/babel-preset-app')
        ]
      })
      .end()
      .use(`${type}-loader`)
      .loader(require.resolve(loader))
  }

  async createPages () {
    const files = await glob('**/*.vue', { cwd: this.pagesDir })

    for (const file of files) {
      this.createPage(file)
    }

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch('**/*.vue', {
        ignoreInitial: true,
        cwd: this.pagesDir
      })

      watcher.on('add', file => this.createPage(slash(file)))
      watcher.on('unlink', file => this.removePage(slash(file)))
    }
  }

  createPage (file) {
    const name = /^[iI]ndex\.vue$/.test(file) ? 'home' : undefined

    return this.pages.createPage({
      name,
      path: this.createPagePath(file),
      component: path.join(this.pagesDir, file)
    })
  }

  removePage (file) {
    const component = path.join(this.pagesDir, file)
    return this.pages.removePage({ component })
  }

  createPagePath (filePath) {
    const path = filePath
      .split('/')
      .filter(s => !/^[iI]ndex\.vue$/.test(s))
      .map(s => s.replace(/\.vue$/, ''))
      .map(s => this.store.slugify(s))
      .join('/')

    return `/${path}`
  }
}

module.exports = VuePages
