const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')

const { Source } = require('@gridsome/core')

class FilesystemSource extends Source {
  static defaultOptions () {
    return {
      path: undefined,
      route: '/:type/:slug',
      type: 'node',
      typeNamePrefix: 'Filesystem'
    }
  }

  async apply () {
    const { options } = this

    const files = await glob(options.path, { cwd: this.context })

    this.addType(options.type, {
      name: options.typeName,
      route: options.route
    })

    files.map(file => {
      const absPath = this.resolve(file)
      const mimeType = this.mime.lookup(file)
      const content = fs.readFileSync(absPath, 'utf-8')
      const results = this.transform(content, mimeType, options, file)
      let filename = path.parse(file).name

      if (filename === 'index') {
        filename = path.basename(path.dirname(file))
      }

      this.addNode(options.type, {
        title: results.title,
        slug: results.fields.slug || filename,
        created: results.fields.date || null,
        content: results.content,
        excerpt: results.excerpt,
        fields: results.fields
      })
    })

    if (process.env.NODE_ENV === 'development' && this.options.watch) {
      const watcher = chokidar.watch(this.options.path, {
        cwd: this.context,
        ignoreInitial: true
      })

      watcher.on('add', file => console.log('add', file))
      watcher.on('unlink', file => console.log('unlink', file))
      watcher.on('change', file => console.log('change', file))
    }
  }
}

module.exports = FilesystemSource
