const fs = require('fs-extra')
const chalk = require('chalk')
const isUrl = require('is-url')
const columnify = require('columnify')
const resolvePort = require('./server/resolvePort')
const { prepareUrls, formatPrettyUrl } = require('./server/utils')

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

    if (urls.lan.pretty) {
      addTerm('Site running at:')
      addTerm('- Local:', urls.local.pretty)
      addTerm('- Network:', urls.lan.pretty)
      addSeparator()
    } else {
      addTerm('Site running at:', urls.local.pretty)
    }

    addTerm('Explore GraphQL data at:', urls.explore.pretty)

    app.compiler.hooks.done.call(
      { addTerm, addSeparator },
      { stats, hostname, port, formatPrettyUrl }
    )

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
