const path = require('path')
const glob = require('globby')
const slash = require('slash')
const crypto = require('crypto')
const chokidar = require('chokidar')
const { createPagePath, parseComponent } = require('./lib/utils')

class VueSource {
  static defaultOptions () {
    return {
      typeName: 'Vue',
      pathPrefix: '/',
      path: ['src/pages/**/*.vue', 'src/templates/*.vue']
    }
  }

  constructor (api, options) {
    this.options = options
    this.context = api.context
    this.source = api.store

    api.loadSource(args => this.addPages(args))
  }

  async addPages () {
    const files = await glob(this.options.path, { cwd: this.context })

    files.forEach(file => this.addPage(file))

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(this.options.path, {
        ignoreInitial: true,
        cwd: this.context
      })

      watcher.on('add', file => this.addPage(slash(file)))
      watcher.on('unlink', file => this.source.removePage(createId(slash(file))))
      watcher.on('change', file => this.updatePage(slash(file)))
    }
  }

  addPage (file) {
    const { type, options } = createPage(this, file)
    return this.source.addPage(type, options)
  }

  updatePage (file) {
    const id = createId(file)
    const { options } = createPage(this, file)
    return this.source.updatePage(id, options)
  }
}

function createPage (source, file) {
  const { name } = path.parse(file)
  const component = source.source.resolve(file)
  const { pageQuery } = parseComponent(component)
  const _id = createId(file)
  let type = 'page'

  const options = {
    _id,
    pageQuery,
    component,
    slug: source.source.slugify(name),
    path: createPagePath(file),
    internal: {
      origin: file
    }
  }

  if (/^src\/pages\/404\.vue$/.test(file)) {
    type = '404'
  }

  if (/^src\/templates\//.test(file)) {
    type = 'template'
    options.typeName = path.parse(file).name
  }

  return { type, options }
}

function createId (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

module.exports = VueSource
