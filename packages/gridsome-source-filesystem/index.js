const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')
const { mapValues } = require('lodash')

const { Source } = require('@gridsome/core')

class FilesystemSource extends Source {
  static defaultOptions () {
    return {
      path: undefined,
      route: '/:type/:slug',
      type: 'node',
      refs: {},
      typeNamePrefix: 'Filesystem'
    }
  }

  async apply () {
    const { options } = this

    const refs = normalizeRefs(options.refs)
    const files = await glob(options.path, { cwd: this.context })

    this._nodesCache = {}

    this.addType(options.type, {
      route: options.route,
      refs: mapValues(refs, ref => ({
        key: ref.key,
        type: ref.type
      }))
    })

    mapValues(refs, ref => {
      this.addType(ref.type, {
        route: ref.route
      })
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

      const node = {
        _id: this.makeUid(file),
        title: results.title,
        slug: results.fields.slug || filename,
        created: results.fields.date || null,
        content: results.content,
        excerpt: results.excerpt,
        fields: results.fields,
        refs: {}
      }

      // create simple references
      for (const fieldName in results.fields) {
        if (options.refs.hasOwnProperty(fieldName)) {
          const value = results.fields[fieldName]
          const type = options.refs[fieldName].type

          node.refs[fieldName] = value

          if (Array.isArray(value)) {
            value.forEach(v => this.createRefNode(type, fieldName, v))
          } else {
            this.createRefNode(type, fieldName, value)
          }
        }
      }

      this.addNode(options.type, node)
    })

    if (process.env.NODE_ENV === 'development' && this.options.watch) {
      const watcher = chokidar.watch(this.options.path, {
        cwd: this.context,
        ignoreInitial: true
      })

      // TODO: update nodes when changed
      watcher.on('add', file => console.log('add', file))
      watcher.on('unlink', file => console.log('unlink', file))
      watcher.on('change', file => console.log('change', file))
    }
  }

  createRefNode (type, fieldName, value) {
    const cacheKey = `${type}-${fieldName}-${value}`

    if (!this._nodesCache[cacheKey] && value) {
      this.addNode(type, { title: value, slug: value })
      this._nodesCache[cacheKey] = true
    }
  }
}

function normalizeRefs (refs) {
  return mapValues(refs, (ref, key) => ({
    type: ref.type || key,
    key: ref.key || 'slug',
    route: ref.route || `/${ref.type || key}/:slug`
  }))
}

module.exports = FilesystemSource
