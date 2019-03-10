const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const chokidar = require('chokidar')
const { parse, join } = require('path')
const { createPagePath, parseComponent } = require('./lib/utils')

class VueSource {
  static defaultOptions () {
    return {}
  }

  constructor (api, options) {
    this.options = options
    this.store = api.store
    this.pages = api.pages

    this.pagesDir = api.config.pagesDir
    this.templatesDir = api.config.templatesDir

    api.registerComponentParser({
      test: /\.vue$/,
      parse: parseComponent
    })

    if (fs.existsSync(this.pagesDir)) {
      api.createPages(args => this.createPages(args))
    }

    if (fs.existsSync(this.templatesDir)) {
      api.createPages(args => this.createTemplates(args))
    }

    // if (process.env.NODE_ENV === 'development') {
    //   const watcher = chokidar.watch(options.path, {
    //     ignoreInitial: true,
    //     cwd: api.context
    //   })

    //   watcher.on('add', file => this.addPage(slash(file)))
    //   watcher.on('unlink', file => api.store.removePage(createId(slash(file))))
    //   watcher.on('change', file => this.updatePage(slash(file)))
    // }
  }

  async createPages () {
    const files = await glob('**/*.vue', { cwd: this.pagesDir })

    for (const file of files) {
      this.createPage(file)
    }
  }

  async createTemplates () {
    const files = await glob('*.vue', { cwd: this.templatesDir })

    for (const file of files) {
      this.createTemplate(file)
    }
  }

  createPage (file) {
    const path = createPagePath(file)
    const name = path === '/' ? 'home' : undefined
    const component = join(this.pagesDir, file)

    return this.pages.addPage({ path, name, component })
  }

  createTemplate (file) {
    const { name: typeName } = parse(file)
    const collection = this.store.getContentType(typeName)

    if (!collection) return

    return this.pages._addTemplate({
      typeName,
      route: collection.options.route,
      component: join(this.templatesDir, file)
    })
  }
}

module.exports = VueSource
