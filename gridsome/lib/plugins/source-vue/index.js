const path = require('path')
const glob = require('globby')
const crypto = require('crypto')
const chokidar = require('chokidar')
const { createPagePath, parseComponent } = require('./lib/utils')

class VueSource {
  static defaultOptions () {
    return {
      typeName: 'Vue',
      path: ['src/pages/**/*.vue', 'src/templates/*.vue']
    }
  }

  constructor (options, { context, source }) {
    this.options = options
    this.context = context
    this.source = source
  }

  async apply () {
    const files = await glob(this.options.path, { cwd: this.context })

    files.forEach(file => this.addPage(file))

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(this.options.path, {
        ignoreInitial: true,
        cwd: this.context
      })

      watcher.on('add', file => this.addPage(file))
      watcher.on('unlink', file => this.source.removePage(createId(file)))
      watcher.on('change', file => this.updatePage(file))
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
  const absPath = source.source.resolve(file)
  const { pageQuery } = parseComponent(absPath)
  const component = file.replace('src', '~')
  const _id = createId(file)
  let type = 'page'

  const options = {
    _id,
    component,
    pageQuery,
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
    options.pageQuery.type = path.parse(file).name
  }

  return { type, options }
}

function createId (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

module.exports = VueSource
