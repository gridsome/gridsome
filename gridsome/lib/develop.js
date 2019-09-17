const fs = require('fs-extra')
const chalk = require('chalk')
const columnify = require('columnify')
const resolvePort = require('./server/resolvePort')
const { prepareUrls } = require('./server/utils')

const {
  hasWarnings,
  logAllWarnings
} = require('./utils/deprecate')

module.exports = async (context, args) => {
  process.env.NODE_ENV = 'development'
  process.env.GRIDSOME_MODE = 'serve'

  const createApp = require('./app')
  const Server = require('./server/Server')

  const app = await createApp(context, { args })
  const port = await resolvePort(app.config.port)
  const hostname = app.config.host
  const urls = prepareUrls(hostname, port)
  const server = new Server(app, urls)

  await fs.emptyDir(app.config.cacheDir)

  const webpackConfig = await createWebpackConfig(app)
  const compiler = require('webpack')(webpackConfig)

  server.hooks.setup.tap('develop', server => {
    server.use(require('webpack-hot-middleware')(compiler, {
      quiet: true,
      log: false
    }))
  })

  server.hooks.afterSetup.tap('develop', server => {
    const devMiddleware = require('webpack-dev-middleware')(compiler, {
      pathPrefix: webpackConfig.output.pathPrefix,
      logLevel: 'silent'
    })

    server.use(devMiddleware)
  })

  compiler.hooks.done.tap('develop', stats => {
    if (stats.hasErrors()) {
      return
    }

    const columns = []

    if (urls.lan.pretty) {
      columns.push({ label: 'Site running at:' })
      columns.push({ label: '- Local:', url: chalk.cyan(urls.local.pretty) })
      columns.push({ label: '- Network:', url: chalk.cyan(urls.lan.pretty) })
      columns.push({ label: '' })
    } else {
      columns.push({ label: 'Site running at:', url: chalk.cyan(urls.local.pretty) })
    }

    columns.push({ label: 'Explore GraphQL data at:', url: chalk.cyan(urls.explore.pretty) })

    const renderedColumns = columnify(columns, { showHeaders: false })

    console.log()
    console.log(`  ${renderedColumns.split('\n').join('\n  ')}`)
    console.log()

    if (hasWarnings()) {
      console.log()
      console.log(`${chalk.bgYellow.black(' WARNING ')} ${chalk.yellow('Deprecation notices')}`)
      console.log()
      logAllWarnings(app.context)
    }
  })

  server.listen(port, hostname, err => {
    if (err) throw err
  })

  //
  // helpers
  //

  async function createWebpackConfig (app) {
    const config = await app.compiler.resolveChainableWebpackConfig()

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

    return app.compiler.resolveWebpackConfig(false, config)
  }
}
