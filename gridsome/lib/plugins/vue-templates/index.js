const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const { find } = require('lodash')
const chokidar = require('chokidar')

class VueTemplates {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    this.store = api.store
    this.pages = api.pages

    this.templatesDir = api.config.templatesDir

    if (fs.existsSync(this.templatesDir)) {
      api.createManagedPages(args => this.createTemplates(args))
    }
  }

  async createTemplates (pages) {
    this.pages = pages

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

    this.pages.removePagesByComponent(component)

    if (process.env.NODE_ENV === 'development') {
      contentType.off('add', this.createNodePage, this)
      contentType.off('remove', this.removeNodePage, this)
      contentType.off('update', this.updateNodePage, this)
    }
  }

  createNodePage (node) {
    const contentType = this.store.getContentType(node.internal.typeName)
    const component = path.join(this.templatesDir, `${node.internal.typeName}.vue`)
    const { route } = contentType.options

    return this.pages.createPage({
      queryVariables: node,
      path: node.path,
      component,
      route
    })
  }

  updateNodePage (node, oldNode) {
    const contentType = this.store.getContentType(node.internal.typeName)
    const component = path.join(this.templatesDir, `${node.internal.typeName}.vue`)
    const { route } = contentType.options

    if (node.path !== oldNode.path && !route) {
      this.removeNodePage(oldNode)
      return this.createNodePage(node)
    }

    return this.pages.createPage({
      queryVariables: node,
      path: node.path,
      component,
      route
    })
  }

  removeNodePage (node) {
    return this.pages.removePageByPath(node.path)
  }
}

module.exports = VueTemplates
