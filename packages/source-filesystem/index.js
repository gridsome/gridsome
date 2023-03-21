const path = require('path')
const fs = require('fs-extra')
const slash = require('slash')
const crypto = require('crypto')
const mime = require('mime-types')
const { mapValues, trim, trimEnd } = require('lodash')

const isDev = process.env.NODE_ENV === 'development'

class FilesystemSource {
  static defaultOptions () {
    return {
      baseDir: undefined,
      path: undefined,
      route: undefined,
      pathPrefix: undefined,
      index: ['index'],
      typeName: 'FileNode',
      refs: {}
    }
  }

  constructor (api, options) {
    this.api = api
    this.options = options
    this.context = options.baseDir
      ? api.resolve(options.baseDir)
      : api.context
    this.refsCache = {}

    api.loadSource(async actions => {
      this.createCollections(actions)
      await this.createNodes(actions)
      if (isDev) this.watchFiles(actions)
    })
  }

  createCollections (actions) {
    const addCollection = actions.addCollection || actions.addContentType

    this.refs = this.normalizeRefs(this.options.refs)

    this.collection = addCollection({
      typeName: this.options.typeName,
      route: this.options.route
    })

    mapValues(this.refs, (ref, key) => {
      this.collection.addReference(key, ref.typeName)

      if (ref.create) {
        addCollection({
          typeName: ref.typeName,
          route: ref.route
        })
      }
    })
  }

  async createNodes (actions) {
    const glob = require('globby')

    const files = await glob(this.options.path, { cwd: this.context })

    await Promise.all(files.map(async file => {
      const options = await this.createNodeOptions(file, actions)
      const node = this.collection.addNode(options)

      this.createNodeRefs(node, actions)
    }))
  }

  createNodeRefs (node, actions) {
    for (const fieldName in this.refs) {
      const ref = this.refs[fieldName]

      if (node && node[fieldName] && ref.create) {
        const value = node[fieldName]
        const typeName = ref.typeName

        if (Array.isArray(value)) {
          value.forEach(value =>
            this.addRefNode(typeName, fieldName, value, actions)
          )
        } else {
          this.addRefNode(typeName, fieldName, value, actions)
        }
      }
    }
  }

  watchFiles (actions) {
    const chokidar = require('chokidar')

    const watcher = chokidar.watch(this.options.path, {
      cwd: this.context,
      ignoreInitial: true
    })

    watcher.on('add', async file => {
      const options = await this.createNodeOptions(slash(file), actions)
      const node = this.collection.addNode(options)

      this.createNodeRefs(node, actions)
    })

    watcher.on('unlink', file => {
      const absPath = path.join(this.context, slash(file))

      this.collection.removeNode({
        'internal.origin': absPath
      })
    })

    watcher.on('change', async file => {
      const options = await this.createNodeOptions(slash(file), actions)
      const node = this.collection.updateNode(options)

      this.createNodeRefs(node, actions)
    })
  }

  // helpers

  async createNodeOptions (file, actions) {
    const relPath = path.relative(this.context, file)
    const origin = path.join(this.context, file)
    const content = await fs.readFile(origin, 'utf8')
    const { dir, name, ext = '' } = path.parse(file)
    const mimeType = mime.lookup(file) || `application/x-${ext.replace('.', '')}`

    return {
      id: this.createUid(relPath),
      path: this.createPath({ dir, name }, actions),
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

  addRefNode (typeName, fieldName, value, actions) {
    const getCollection = actions.getCollection || actions.getContentType
    const cacheKey = `${typeName}-${fieldName}-${value}`

    if (!this.refsCache[cacheKey] && value) {
      this.refsCache[cacheKey] = true

      getCollection(typeName).addNode({ id: value, title: value })
    }
  }

  createPath ({ dir, name }, actions) {
    const { permalinks = {}} = this.api.config
    const pathPrefix = trim(this.options.pathPrefix, '/')
    const pathSuffix = permalinks.trailingSlash ? '/' : ''

    const segments = slash(dir).split('/').map(segment => {
      return actions.slugify(segment)
    })

    if (!this.options.index.includes(name)) {
      segments.push(actions.slugify(name))
    }

    if (pathPrefix) {
      segments.unshift(pathPrefix)
    }

    const res = trimEnd('/' + segments.filter(Boolean).join('/'), '/')

    return (res + pathSuffix) || '/'
  }

  normalizeRefs (refs) {
    return mapValues(refs, (ref) => {
      if (typeof ref === 'string') {
        ref = { typeName: ref, create: false }
      }

      if (!ref.typeName) {
        ref.typeName = this.options.typeName
      }

      if (ref.create) {
        ref.create = true
      } else {
        ref.create = false
      }

      return ref
    })
  }

  createUid (orgId) {
    return crypto.createHash('md5').update(orgId).digest('hex')
  }
}

module.exports = FilesystemSource
