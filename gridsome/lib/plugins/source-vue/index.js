const path = require('path')
const fs = require('fs-extra')
const glob = require('globby')
const chalk = require('chalk')
const crypto = require('crypto')
const chokidar = require('chokidar')
const { kebabCase } = require('lodash')
const compiler = require('vue-template-compiler')
const { parse } = require('@vue/component-compiler-utils')

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
  const component = file.replace('src', '@')
  const _id = createId(file)
  let type = 'page'

  const options = {
    _id,
    component,
    pageQuery,
    slug: source.source.slugify(name),
    path: createPagePath(file),
    file
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

function parseComponent (file) {
  const filename = path.parse(file).name
  const source = fs.readFileSync(file, 'utf-8')
  const { customBlocks } = parse({ filename, source, compiler })
  const block = customBlocks.filter(block => {
    // TODO: remove deprecation warning before v1.0
    if (block.type === 'graphql') {
      console.log(chalk.yellow(
        `${filename}.vue: The <graphql> block is deprecated. Use <page-query> instead.`
      ))
    }

    return /^(graphql|page-query)$/.test(block.type)
  }).shift()

  const res = {
    pageQuery: { content: null }
  }

  if (block) {
    res.pageQuery = {
      content: block.content,
      options: block.attrs
    }
  }

  return res
}

/**
 * Index.vue -> /
 * Features.vue -> /features
 * blog/Index.vue -> /blog
 * AboutUs.vue -> /about-us
 */
function createPagePath (file) {
  const route = file
    .replace(/^src\//, '')        // remove src dirname
    .replace(/^pages\//, '')      // remove pages dirname
    .replace(/\.vue$/, '')        // removes .vue extension
    .replace(/\/?[iI]ndex$/, '/') // replaces /index with a /
    .replace(/(^\/+|\/+$)/g, '')  // remove slahes

  return '/' + route.split('/').map(s => kebabCase(s)).join('/')
}

function createId (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

module.exports = VueSource
