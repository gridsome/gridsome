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
    const files = await glob('**/*.vue', {
      cwd: this.pagesDir,
      absolute: true
    })

    for (const file of files) {
      createPage(this.createPageOptions(file, slugify))
    }

    if (process.env.NODE_ENV === 'development') {
      // Watch pages directory without globbing to make
      // dynamic route params work in folder names.
      const watcher = chokidar.watch(this.pagesDir, {
        disableGlobbing: true,
        ignoreInitial: true
      })

      watcher.on('add', file => {
        if (/\.vue$/.test(file)) {
          createPage(this.createPageOptions(slash(file), slugify))
        }
      })

      watcher.on('unlink', file => {
        if (/\.vue$/.test(file)) {
          removePagesByComponent(slash(file))
        }
      })
    }
  }

  createPageOptions (absolutePath, slugify) {
    const { trailingSlash } = this.api.config.permalinks
    const relativePath = path.relative(this.pagesDir, absolutePath)
    const pagePath = createPagePath(relativePath, slugify)

    return {
      path: trailingSlash ? trimEnd(pagePath, '/') + '/' : pagePath,
      name: /^[iI]ndex\.vue$/.test(relativePath) ? 'home' : undefined,
      component: absolutePath
    }
  }
}

module.exports = VuePages
