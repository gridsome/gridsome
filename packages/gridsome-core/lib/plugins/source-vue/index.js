const path = require('path')
const glob = require('globby')
const chokidar = require('chokidar')
const createCompiler = require('./lib/create-compiler')

/**
 * index.vue -> /
 * features.vue -> /features
 * blog/index.vue -> /blog
 */
function filePathToRoute (file) {
  const route = file.toLowerCase()
    .replace(/^pages\//, '')   // remove pages folder
    .replace(/\.vue$/, '')     // removes .vue extension
    .replace(/\/?index$/, '/') // replaces /index with a /
    .replace(/(^\/|\/$)/g, '') // remove slahes

  return `/${route}`
}

module.exports = api => {
  api.client(false)

  const cwd = api.resolve('src')
  const compiler = createCompiler()
  const paths = ['pages/**/*.vue', 'templates/*.vue']

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
        const id = api.resolve(file)
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
      const componentPath = api.resolve(path.join(cwd, file))
      const { graphql } = await compiler.parse(componentPath)

      const options = {
        _id: api.resolve(file),
        component: componentPath,
        slug: filePathToRoute(file),
        graphql
      }

      if (/^pages\/404\.vue$/.test(file)) {
        options.type = '404'
      }

      if (/^templates\//.test(file)) {
        options.type = 'template'
        options.graphql.type = path.parse(file).name
      }

      await addPage(options)
    }))
  }
}
