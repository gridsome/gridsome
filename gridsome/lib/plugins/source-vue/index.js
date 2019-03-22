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
      watcher.on('change', file => this.createPage(slash(file)))
    }
  }

  createPage (file) {
    const path = createPagePath(file)
    const name = path === '/' ? 'home' : undefined
    const component = join(this.pagesDir, file)

    return this.pages.createPage({ path, name, component, autoCreated: true })
  }

  removePage (file) {
    const component = join(this.pagesDir, file)
    return this.pages.removePage({ component })
  }

  async createTemplates () {
    const files = await glob('*.vue', { cwd: this.templatesDir })

    for (const file of files) {
      this.createTemplate(file)
    }

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch('*.vue', {
        ignoreInitial: true,
        cwd: this.templatesDir
      })

      watcher.on('add', file => this.createTemplate(slash(file)))
      watcher.on('unlink', file => this.removeTemplate(slash(file)))
      watcher.on('change', file => this.createTemplate(slash(file)))
    }
  }

  createTemplate (file) {
    const { name: typeName } = parse(file)
    const contentType = this.store.getContentType(typeName)

    if (!contentType) return

    contentType.collection.find().forEach(node => {
      this.createNodePage(node)
    })

    if (process.env.NODE_ENV === 'development') {
      contentType.on('add', this.createNodePage, this)
      contentType.on('remove', this.removeNodePage, this)
      contentType.on('update', this.updateNodePage, this)
    }
  }

  removeTemplate (file) {
    const { name: typeName } = parse(file)
    const contentType = this.store.getContentType(typeName)
    const component = join(this.templatesDir, file)

    if (!contentType) return

    this.pages.removePage({ component })

    if (process.env.NODE_ENV === 'development') {
      contentType.off('add', this.createNodePage, this)
      contentType.off('remove', this.removeNodePage, this)
      contentType.off('update', this.updateNodePage, this)
    }
  }

  createNodePage (node) {
    const contentType = this.store.getContentType(node.typeName)
    const component = join(this.templatesDir, `${node.typeName}.vue`)
    const { route } = contentType.options

    return this.pages.createPage({
      autoCreated: true,
      queryContext: node,
      path: node.path,
      component,
      route
    })
  }

  updateNodePage (node, oldNode) {
    const contentType = this.store.getContentType(node.typeName)
    const component = join(this.templatesDir, `${node.typeName}.vue`)
    const { route } = contentType.options

    if (node.path !== oldNode.path && !route) {
      this.removeNodePage(oldNode)
      return this.createNodePage(node)
    }

    return this.pages.createPage({
      queryContext: node,
      path: node.path,
      component,
      route
    })
  }

  removeNodePage (node) {
    return this.pages.removePage({ path: node.path })
  }
}

module.exports = VueSource
