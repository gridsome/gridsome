const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const { find } = require('lodash')
const chokidar = require('chokidar')
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

    api.transpileDependencies([path.resolve(__dirname, 'lib', 'loaders')])
    api.registerComponentParser({ test: /\.vue$/, parse: parseComponent })

    api.chainWebpack(config => {
      this.createGraphQLRule(config, 'page-query', './lib/loaders/page-query')
      this.createGraphQLRule(config, 'static-query', './lib/loaders/static-query')
    })

    if (fs.existsSync(this.pagesDir)) {
      api.createPages(args => this.createPages(args))
    }

    if (fs.existsSync(this.templatesDir)) {
      api.createPages(args => this.createTemplates(args))
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
      path: createPagePath(file),
      component: path.join(this.pagesDir, file)
    })
  }

  removePage (file) {
    const component = path.join(this.pagesDir, file)
    return this.pages.removePage({ component })
  }

  async createTemplates () {
    const files = await glob('**/*.vue', { cwd: this.templatesDir })

    for (const file of files) {
      this.createTemplate(file)
    }

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch('**/*.vue', {
        ignoreInitial: true,
        cwd: this.templatesDir
      })

      watcher.on('add', file => this.createTemplate(slash(file)))
      watcher.on('unlink', file => this.removeTemplate(slash(file)))
    }
  }

  createTemplate (file) {
    const component = path.join(this.templatesDir, file)
    const contentType = find(this.store.store.collections, ({ options }) => {
      return options.component === component
    })

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
    const component = path.join(this.templatesDir, file)
    const contentType = find(this.store.store.collections, ({ options }) => {
      return options.component === component
    })

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
    const component = path.join(this.templatesDir, `${node.typeName}.vue`)
    const { route } = contentType.options

    return this.pages.createPage({
      queryContext: node,
      path: node.path,
      component,
      route
    })
  }

  updateNodePage (node, oldNode) {
    const contentType = this.store.getContentType(node.typeName)
    const component = path.join(this.templatesDir, `${node.typeName}.vue`)
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
