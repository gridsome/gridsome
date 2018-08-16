const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')
const { mapValues, kebabCase } = require('lodash')

const { Source } = require('@gridsome/core')

class FilesystemSource extends Source {
  static defaultOptions () {
    return {
      path: undefined,
      route: undefined,
      type: 'node',
      refs: {},
      index: ['index'],
      typeNamePrefix: 'Filesystem'
    }
  }

  async apply () {
    const { options } = this

    const refs = this.normalizeRefs(options.refs)
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
      let { name } = path.parse(file)

      if (options.index.includes(name)) {
        name = path.basename(path.dirname(file))
      }

      const node = {
        _id: this.makeUid(file),
        title: results.title,
        slug: results.fields.slug || kebabCase(name),
        path: this.normalizePath(file),
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
            value.forEach(v => this.addRefNode(type, fieldName, v))
          } else {
            this.addRefNode(type, fieldName, value)
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

  // helpers

  addRefNode (type, fieldName, value) {
    const cacheKey = `${type}-${fieldName}-${value}`

    if (!this._nodesCache[cacheKey] && value) {
      this.addNode(type, { title: value, slug: value })
      this._nodesCache[cacheKey] = true
    }
  }

  normalizePath (file) {
    // dont generate path for dynamic routes
    if (this.options.route) return

    const { dir, name } = path.parse(file)
    const segments = dir.split(path.sep).map(s => this.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.slugify(name))
    }

    return `/${segments.join('/')}`
  }

  normalizeRefs (refs) {
    return mapValues(refs, (ref, key) => ({
      type: ref.type || key,
      key: ref.key || 'slug',
      route: ref.route || `/${ref.type || key}/:slug`
    }))
  }
}

module.exports = FilesystemSource
