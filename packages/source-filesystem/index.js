const path = require('path')
const fs = require('fs-extra')
const { mapValues } = require('lodash')

const isDev = process.env.NODE_ENV === 'development'

class FilesystemSource {
  static defaultOptions () {
    return {
      baseDir: undefined,
      path: undefined,
      route: undefined,
      index: ['index'],
      typeName: 'FileNode',
      refs: {}
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options
    this.store = api.store
    this.context = options.baseDir
      ? api.resolve(options.baseDir)
      : api.context
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
      this.contentType.addReference(key, ref.typeName)

      if (ref.create) {
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

      this.createNodeRefs(node)
    }))
  }

  createNodeRefs (node) {
    for (const fieldName in this.refs) {
      const ref = this.refs[fieldName]

      if (ref.create && node.fields[fieldName]) {
        const value = node.fields[fieldName]
        const typeName = ref.typeName

        if (Array.isArray(value)) {
          value.forEach(value =>
            this.addRefNode(typeName, fieldName, value)
          )
        } else {
          this.addRefNode(typeName, fieldName, value)
        }
      }
    }
  }

  watchFiles () {
    const slash = require('slash')
    const chokidar = require('chokidar')

    const watcher = chokidar.watch(this.options.path, {
      cwd: this.context,
      ignoreInitial: true
    })

    watcher.on('add', async file => {
      const options = await this.createNodeOptions(slash(file))
      const node = this.contentType.addNode(options)

      this.createNodeRefs(node)
    })

    watcher.on('unlink', file => {
      const absPath = path.join(this.context, slash(file))

      this.contentType.removeNode({
        'internal.origin': absPath
      })
    })

    watcher.on('change', async file => {
      const options = await this.createNodeOptions(slash(file))
      const node = this.contentType.updateNode(options)

      this.createNodeRefs(node)
    })
  }

  // helpers

  async createNodeOptions (file) {
    const origin = path.join(this.context, file)
    const relPath = path.relative(this.context, file)
    const mimeType = this.store.mime.lookup(file)
    const content = await fs.readFile(origin, 'utf8')
    const id = this.store.makeUid(relPath)
    const { dir, name, ext = '' } = path.parse(file)
    const routePath = this.createPath({ dir, name })

    return {
      id,
      path: routePath,
      fileInfo: {
        extension: ext,
        directory: dir,
        path: file,
        name
      },
      internal: {
        mimeType,
        content,
        origin
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

  createPath ({ dir, name }) {
    if (this.options.route) return

    const segments = dir.split('/').map(s => this.store.slugify(s))

    if (!this.options.index.includes(name)) {
      segments.push(this.store.slugify(name))
    }

    return `/${segments.join('/')}`
  }

  normalizeRefs (refs) {
    const { slugify } = this.store

    return mapValues(refs, (ref, key) => {
      if (typeof ref === 'string') {
        ref = { typeName: ref, create: false }
      }

      if (!ref.typeName) {
        ref.typeName = this.options.typeName
      }

      if (ref.create) {
        ref.route = ref.route || `/${slugify(ref.typeName)}/:slug`
        ref.create = true
      } else {
        ref.create = false
      }

      return ref
    })
  }
}

module.exports = FilesystemSource
