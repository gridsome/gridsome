const path = require('path')
const fs = require('fs-extra')
const hash = require('hash-sum')
const { mapValues } = require('lodash')

const isDev = process.env.NODE_ENV === 'development'

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
    this.refsCache = {}

    api.loadSource(async () => {
      await this.createContentTypes()
      await this.createNodes()
      if (isDev) this.watchFiles()
    })
  }

  createContentTypes () {
    this.refs = this.normalizeRefs(this.options.refs)

    this.contentType = this.store.addContentType({
      typeName: this.options.typeName,
      route: this.options.route
    })

    mapValues(this.refs, (ref, key) => {
      this.contentType.addReference(key, {
        typeName: ref.typeName
      })

      if (!ref.exists) {
        this.store.addContentType({
          typeName: ref.typeName,
          route: ref.route
        })
      }
    })
  }

  async createNodes () {
    const glob = require('globby')

    const files = await glob(this.options.path, { cwd: this.context })

    await Promise.all(files.map(async file => {
      const options = await this.createNodeOptions(file)
      const node = this.contentType.addNode(options)

      for (const fieldName in this.refs) {
        if (node.fields[fieldName]) {
          const ref = this.refs[fieldName]
          const value = node.fields[fieldName]
          const typeName = ref.typeName

          if (ref.exists) continue

          if (Array.isArray(value)) {
            value.forEach(value =>
              this.addRefNode(typeName, fieldName, value)
            )
          } else {
            this.addRefNode(typeName, fieldName, value)
          }
        }
      }
    }))
  }

  watchFiles () {
    const slash = require('slash')
    const chokidar = require('chokidar')

    const watcher = chokidar.watch(this.options.path, {
      cwd: this.context,
      ignoreInitial: true
    })

    watcher.on('add', file => {
      const filePath = slash(file)
      const options = this.createNodeOptions(filePath)

      this.contentType.addNode(options)
    })

    watcher.on('unlink', file => {
      const filePath = slash(file)
      const id = this.store.makeUid(filePath)

      this.contentType.removeNode(id)
    })

    watcher.on('change', file => {
      const filePath = slash(file)
      const options = this.createNodeOptions(filePath)

      this.contentType.updateNode(options.id, options)
    })
  }

  // helpers

  async createNodeOptions (file) {
    const filePath = path.join(this.context, file)
    const mimeType = this.store.mime.lookup(file)
    const content = await fs.readFile(filePath, 'utf-8')

    return {
      id: hash(file),
      path: this.createPath(file),
      internal: {
        mimeType,
        content,
        origin: filePath
      }
    }
  }

  addRefNode (typeName, fieldName, value) {
    const cacheKey = `${typeName}-${fieldName}-${value}`

    if (!this.refsCache[cacheKey] && value) {
      this.refsCache[cacheKey] = true

      this.store
        .getContentType(typeName)
        .addNode({ id: value, title: value })
    }
  }

  createPath (file) {
    if (this.options.route) return

    const { dir, name } = path.parse(file)
    const segments = dir.split('/').map(s => this.store.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.store.slugify(name))
    }

    return `/${segments.join('/')}`
  }

  normalizeRefs (refs) {
    const { slugify } = this.store

    return mapValues(refs, (ref, key) => {
      let typeName = this.options.typeName
      let route = this.options.route

      if (ref.typeName) {
        typeName = ref.typeName
        route = ref.route || `/${slugify(typeName)}/:slug`
      }

      const exists = !!this.store.getContentType(typeName)

      return { route, typeName, exists }
    })
  }
}

module.exports = FilesystemSource
