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
    this.api = api
    this.options = options
    this.context = api.context
    this.store = api.store
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

    api.loadSource(args => this.addNodes(args))
  }

  async addNodes () {
    const { options } = this

    const refs = this.normalizeRefs(options.refs)
    const files = await glob(options.path, { cwd: this.context })

    const contentType = this.store.addContentType({
      typeName: options.typeName,
      route: options.route,
      refs: mapValues(refs, ref => ({
        typeName: ref.typeName,
        key: ref.key
      }))
    })

    mapValues(refs, ref => {
      this.store.addContentType({
        typeName: ref.typeName,
        route: ref.route
      })
    })

    files.map(file => {
      const node = this.createNode(file)

      // create simple references
      for (const fieldName in node.fields) {
        if (options.refs.hasOwnProperty(fieldName)) {
          const value = node.fields[fieldName]
          const typeName = options.refs[fieldName].typeName

          node.refs[fieldName] = value

          if (Array.isArray(value)) {
            value.forEach(v => this.addRefNode(typeName, fieldName, v))
          } else {
            this.addRefNode(typeName, fieldName, value)
          }
        }
      }

      contentType.addNode(node)
    })

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(this.options.path, {
        cwd: this.context,
        ignoreInitial: true
      })

      // TODO: update nodes when changed
      watcher.on('add', file => {
        const node = this.createNode(slash(file))
        contentType.addNode(options.type, node)
      })

      watcher.on('unlink', file => {
        const id = this.store.makeUid(slash(file))
        contentType.removeNode(options.type, id)
      })

      watcher.on('change', file => {
        const node = this.createNode(slash(file))
        contentType.updateNode(options.type, node._id, node)
      })
    }
  }

  // helpers

  createNode (file) {
    const filePath = this.store.resolve(file)
    const mimeType = this.store.mime.lookup(file)
    const content = fs.readFileSync(filePath, 'utf-8')

    const node = {
      _id: this.store.makeUid(file),
      path: this.normalizePath(file),
      internal: {
        mimeType,
        content,
        origin: filePath
      }
    }

    return node
  }

  addRefNode (typeName, fieldName, value) {
    const cacheKey = `${typeName}-${fieldName}-${value}`
    const contentType = this.store.getContentType(typeName)

    if (!this.nodesCache[cacheKey] && value) {
      contentType.addNode({ title: value, slug: value })
      this.nodesCache[cacheKey] = true
    }
  }

  normalizePath (file) {
    // dont generate path for dynamic routes
    if (this.options.route) return

    const { dir, name } = path.parse(file)
    const segments = dir.split('/').map(s => this.store.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.store.slugify(name))
    }

    return `/${segments.join('/')}`
  }

  normalizeRefs (refs) {
    return mapValues(refs, (ref, key) => ({
      route: ref.route || `/${this.store.slugify(ref.typeName)}/:slug`,
      typeName: ref.typeName || this.options.typeName,
      key: ref.key
    }))
  }
}

module.exports = FilesystemSource
