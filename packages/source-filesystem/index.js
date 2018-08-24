const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chokidar = require('chokidar')
const { mapValues } = require('lodash')

class FilesystemSource {
  static defaultOptions () {
    return {
      path: undefined,
      route: undefined,
      type: 'node',
      refs: {},
      index: ['index'],
      typeName: 'Filesystem'
    }
  }

  constructor (options, { context, source }) {
    this.options = options
    this.context = context
    this.source = source

    this.nodesCache = {}
  }

  async apply () {
    const { options } = this

    const refs = this.normalizeRefs(options.refs)
    const files = await glob(options.path, { cwd: this.context })

    this.source.addType(options.type, {
      route: options.route,
      refs: mapValues(refs, ref => ({
        key: ref.key,
        type: ref.type
      }))
    })

    mapValues(refs, ref => {
      this.source.addType(ref.type, {
        route: ref.route
      })
    })

    files.map(file => {
      const filePath = this.source.resolve(file)
      const mimeType = this.source.mime.lookup(file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const result = this.source.transform(mimeType, content)

      const node = {
        _id: this.source.makeUid(file),
        path: this.normalizePath(file),
        fields: result.fields,
        refs: {},
        internal: {
          mimeType,
          origin: filePath,
          content: result.content
        }
      }

      // create simple references
      for (const fieldName in result.fields) {
        if (options.refs.hasOwnProperty(fieldName)) {
          const value = result.fields[fieldName]
          const type = options.refs[fieldName].type

          node.refs[fieldName] = value

          if (Array.isArray(value)) {
            value.forEach(v => this.addRefNode(type, fieldName, v))
          } else {
            this.addRefNode(type, fieldName, value)
          }
        }
      }

      this.source.addNode(options.type, node)
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

    if (!this.nodesCache[cacheKey] && value) {
      this.source.addNode(type, { title: value, slug: value })
      this.nodesCache[cacheKey] = true
    }
  }

  normalizePath (file) {
    // dont generate path for dynamic routes
    if (this.options.route) return

    const { dir, name } = path.parse(file)
    const segments = dir.split(path.sep).map(s => this.source.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.source.slugify(name))
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
