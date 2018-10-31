const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const slash = require('slash')
const chokidar = require('chokidar')
const { mapValues } = require('lodash')

class FilesystemSource {
  static defaultOptions () {
    return {
      path: undefined,
      route: undefined,
      refs: {},
      index: ['index'],
      typeName: 'FileNode'
    }
  }

  constructor (api, options) {
    this.options = options
    this.context = api.context
    this.source = api.store
    this.nodesCache = {}

    // TODO: remove this before v1.0
    if (options.type) {
      if (options.typeName === 'FileNode') {
        api.source.typeName = 'Filesystem'
        options.typeName = 'Filesystem'
      }

      const typeName = api.source.makeTypeName(options.type)

      console.log(
        `The 'type' option for @gridsome/source-filesystem is ` +
        `deprecated. Use the 'typeName' option to set the GrahpQL ` +
        `node type and template name instead. Change 'typeName' from ` +
        `'${options.typeName}' to '${typeName}' in your ` +
        `gridsome.config.js\n`
      )
    } else {
      options.type = ''
    }

    api.loadSources(args => this.addNodes(args))
  }

  async addNodes () {
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
      const node = this.createNode(file)

      // create simple references
      for (const fieldName in node.fields) {
        if (options.refs.hasOwnProperty(fieldName)) {
          const value = node.fields[fieldName]
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

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(this.options.path, {
        cwd: this.context,
        ignoreInitial: true
      })

      // TODO: update nodes when changed
      watcher.on('add', file => {
        const node = this.createNode(slash(file))
        this.source.addNode(options.type, node)
      })

      watcher.on('unlink', file => {
        const id = this.source.makeUid(slash(file))
        this.source.removeNode(options.type, id)
      })

      watcher.on('change', file => {
        const node = this.createNode(slash(file))
        this.source.updateNode(options.type, node._id, node)
      })
    }
  }

  // helpers

  createNode (file) {
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

    return node
  }

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
    const segments = dir.split('/').map(s => this.source.slugify(s))

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
