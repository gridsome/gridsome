const path = require('path')
const glob = require('globby')
const crypto = require('crypto')
const chokidar = require('chokidar')
const createCompiler = require('./lib/createCompiler')

module.exports = api => {
  api.client(false)

  const cwd = api.service.context
  const compiler = createCompiler()
  const paths = ['src/pages/**/*.vue', 'src/templates/*.vue']

  api.initSource = async ({ addPage, updateQuery }) => {
    const pages = await glob(paths, { cwd })

    if (process.env.NODE_ENV === 'development') {
      const watcher = chokidar.watch(paths, { cwd, ignoreInitial: true })

      watcher.on('add', file => {
        api.info(`Added ${file}`)
        // TODO: add page and regenerate routes...
      })

      watcher.on('unlink', file => {
        api.info(`Deleted ${file}`)
        // TODO: remove page and regenerate routes...
      })

      watcher.on('change', async file => {
        const id = makeId(file)
        const componentPath = api.resolve(path.join(cwd, file))
        const { graphql } = await compiler.parse(componentPath)

        try {
          await updateQuery(id, graphql)
        } catch (err) {
          api.error(err)
        }
      })
    }

    await Promise.all(pages.map(async file => {
      const absPath = api.resolve(path.join(cwd, file))
      const { graphql } = await compiler.parse(absPath)
      const component = file.replace('src', '@')
      const slug = makeRoute(file)
      const _id = makeId(file)

      const options = {
        _id,
        component,
        graphql,
        slug,
        file
      }

      if (/^src\/pages\/404\.vue$/.test(file)) {
        options.type = '404'
      }

      if (/^src\/templates\//.test(file)) {
        options.type = 'template'
        options.graphql.type = path.parse(file).name
      }

      await addPage(options)
    }))
  }
}

/**
 * index.vue -> /
 * features.vue -> /features
 * blog/index.vue -> /blog
 */
function makeRoute (file) {
  const route = file.toLowerCase()
    .replace(/^src\//, '')     // remove src dirname
    .replace(/^pages\//, '')   // remove pages dirname
    .replace(/\.vue$/, '')     // removes .vue extension
    .replace(/\/?index$/, '/') // replaces /index with a /
    .replace(/(^\/|\/$)/g, '') // remove slahes

  return route
}

function makeId (str) {
  return crypto.createHash('md5').update(str).digest('hex')
}
