const fs = require('fs-extra')
const chalk = require('chalk')
const isUrl = require('is-url')
const columnify = require('columnify')
const { formatPrettyUrl } = require('./server/utils')
const { builtInPlugins } = require('./app/loadConfig')

const {
  hasWarnings,
  logAllWarnings
} = require('./utils/deprecate')

builtInPlugins.push(api => {
  api.chainWebpack(async config => {
    const { urls } = api._app.server

    config
      .plugin('friendly-errors')
      .use(require('friendly-errors-webpack-plugin'))

    config
      .plugin('injections')
      .tap(args => {
        const definitions = args[0]
        args[0] = {
          ...definitions,
          'process.env.SOCKJS_ENDPOINT': JSON.stringify(urls.sockjs.endpoint),
          'process.env.GRAPHQL_ENDPOINT': JSON.stringify(urls.graphql.endpoint)
        }
        return args
      })

    config.entryPoints.store.forEach((entry, name) => {
      config.entry(name)
        .prepend(`webpack-hot-middleware/client?name=${name}&reload=true&noInfo=true`)
        .prepend('webpack/hot/dev-server')
    })
  })
})

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const createApp = require('./app')
  const app = await createApp(context, { args })

  if (app.config.https) {
    await app.server.generateCertificate()
  }

  await fs.emptyDir(app.config.cacheDir)

  const compiler = app.compiler.getCompiler()
  const webpackConfig = app.compiler.getClientConfig()

  app.server.hooks.setup.tap('develop', server => {
    server.use(require('webpack-hot-middleware')(compiler, {
      quiet: true,
      log: false
    }))
  })

  app.server.hooks.afterSetup.tap('develop', server => {
    const devMiddleware = require('webpack-dev-middleware')(compiler, {
      pathPrefix: webpackConfig.output.pathPrefix,
      watchOptions: webpackConfig.devServer ? webpackConfig.devServer.watchOptions : null,
      logLevel: 'silent'
    })

    server.use(devMiddleware)
  })

  compiler.hooks.done.tap('develop', stats => {
    if (stats.hasErrors()) {
      return
    }

    const list = []
    const addTerm = (name, description) => list.push({ name, description })
    const addSeparator = () => list.push({ name: '' })
    const args = { stats, hostname: app.config.host, port: app.config.port, formatPrettyUrl }

    if (app.server.urls.lan.pretty) {
      addTerm('Site running at:')
      addTerm('- Local:', app.server.urls.local.pretty)
      addTerm('- Network:', app.server.urls.lan.pretty)
      addSeparator()
    } else {
      addTerm('Site running at:', app.server.urls.local.pretty)
    }

    addTerm('Explore GraphQL data at:', app.server.urls.explore.pretty)

    app.compiler.hooks.done.call({ addTerm, addSeparator }, args)

    const columns = list
      .filter((term, i, terms) => (
        // remove consecutive separators etc...
        i && term.name ? terms[i - 1].name !== term.name : true
      ))
      .map(term => ({
        name: term.name,
        description: isUrl(term.description)
          ? chalk.cyan(term.description)
          : term.description
      }))

    const rendered = columnify(columns, { showHeaders: false })

    console.log()
    console.log(`  ${rendered.split('\n').join('\n  ')}`)
    console.log()

    if (hasWarnings()) {
      console.log()
      console.log(`${chalk.bgYellow.black(' WARNING ')} ${chalk.yellow('Deprecation notices')}`)
      console.log()
      logAllWarnings(app.context)
    }
  })

  app.server.listen()
}
