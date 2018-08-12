const path = require('path')
const glob = require('globby')
const crypto = require('crypto')
const chokidar = require('chokidar')
const { kebabCase } = require('lodash')
const createCompiler = require('./lib/createCompiler')

module.exports = api => {
  api.client(false)

  const cwd = api.service.context
  const compiler = createCompiler()
  const paths = ['src/pages/**/*.vue', 'src/templates/*.vue']

  api.initSource = async ({ addPage, updatePage, removePage, updateQuery }) => {
    const pages = await glob(paths, { cwd })

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(paths, { cwd, ignoreInitial: true })

      watcher.on('add', file => {
        const page = createPage(file, { cwd, compiler })
        addPage(page)
      })

      watcher.on('unlink', file => {
        removePage(makeId(file))
      })

      watcher.on('change', file => {
        const page = createPage(file, { cwd, compiler })
        updatePage(page)
      })
    }

    pages.map(file => {
      const page = createPage(file, { cwd, compiler })
      addPage(page)
    })
  }
}

function createPage (file, { cwd, compiler }) {
  const { pageQuery } = compiler.parse(path.resolve(cwd, file))
  const component = file.replace('src', '@')
  const slug = makeRoute(file)
  const _id = makeId(file)

  const page = {
    _id,
    component,
    pageQuery,
    slug,
    file
  }

  if (/^src\/pages\/404\.vue$/.test(file)) {
    page.type = '404'
  }

  if (/^src\/templates\//.test(file)) {
    page.type = 'template'
    page.pageQuery.type = path.parse(file).name
  }

  return page
}

function makeId (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

/**
 * Index.vue -> /
 * Features.vue -> /features
 * blog/Index.vue -> /blog
 * AboutUs.vue -> /about-us
 */
function makeRoute (file) {
  const route = file
    .replace(/^src\//, '')     // remove src dirname
    .replace(/^pages\//, '')   // remove pages dirname
    .replace(/\.vue$/, '')     // removes .vue extension
    .replace(/\/?[iI]ndex$/, '/') // replaces /index with a /
    .replace(/(^\/|\/$)/g, '') // remove slahes

  return route.split('/').map(kebabCase).join('')
}
