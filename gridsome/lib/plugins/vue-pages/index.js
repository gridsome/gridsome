const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const chokidar = require('chokidar')
const { trimEnd } = require('lodash')
const { createPagePath } = require('./lib/utils')

class VuePages {
  static defaultOptions () {
    return {}
  }

  constructor (api) {
    this.api = api
    this.pagesDir = api.config.pagesDir

    if (fs.existsSync(this.pagesDir)) {
      api.createManagedPages(args => this.createPages(args))
    }
  }

  async createPages ({ slugify, createPage, removePagesByComponent }) {
    const files = await glob('**/*.vue', { cwd: this.pagesDir })

    for (const file of files) {
      createPage(this.createPageOptions(file, slugify))
    }

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch('**/*.vue', {
        ignoreInitial: true,
        cwd: this.pagesDir
      })

      watcher.on('add', file => {
        createPage(this.createPageOptions(slash(file), slugify))
      })

      watcher.on('unlink', file => {
        removePagesByComponent(path.join(this.pagesDir, slash(file)))
      })
    }
  }

  createPageOptions (file, slugify) {
    const { trailingSlash } = this.api.config.permalinks
    const pagePath = createPagePath(file, slugify)

    return {
      path: trailingSlash ? trimEnd(pagePath, '/') + '/' : pagePath,
      name: /^[iI]ndex\.vue$/.test(file) ? 'home' : undefined,
      component: path.join(this.pagesDir, file)
    }
  }
}

module.exports = VuePages
