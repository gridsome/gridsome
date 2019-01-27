const path = require('path')
const fs = require('fs-extra')
const { snakeCase } = require('lodash')
const slugify = require('@sindresorhus/slugify')

// TODO: let plugins add generated files

class CodeGenerator {
  constructor (app) {
    this.app = app

    this.files = {
      'icons.js': () => genIcons(app),
      'config.js': () => genConfig(app),
      'routes.js': () => genRoutes(app),
      'plugins-server.js': () => genPlugins(app, true),
      'plugins-client.js': () => genPlugins(app, false),
      'now.js': () => `export default ${Date.now()}`
    }
  }

  async generate (filename = null) {
    const outDir = this.app.config.tmpDir

    const outputFile = async filename => {
      const content = await this.files[filename](this.app)
      const filepath = path.join(outDir, filename)
      await fs.outputFile(filepath, content)
    }

    if (filename) {
      await outputFile(filename)
    } else {
      await fs.remove(outDir)

      for (const filename in this.files) {
        await outputFile(filename)
      }
    }
  }
}

module.exports = CodeGenerator

async function genIcons ({ config, resolve, queue }) {
  const { touchicon, favicon } = config.icon
  const touchiconPath = resolve(touchicon.src)
  const faviconPath = resolve(favicon.src)

  const icons = {
    touchiconMimeType: null,
    faviconMimeType: null,
    precomposed: false,
    touchicons: [],
    favicons: []
  }

  if (await fs.exists(touchiconPath)) {
    const touchicons = await queue.add(touchiconPath, {
      sizes: touchicon.sizes,
      srcset: false
    })

    icons.precomposed = touchicon.precomposed
    icons.touchicons = touchicons.sets
    icons.touchiconMimeType = touchicons.mimeType
  }

  if (await fs.exists(faviconPath)) {
    const favicons = await queue.add(faviconPath, {
      sizes: favicon.sizes,
      srcset: false
    })

    icons.favicons = favicons.sets
    icons.faviconMimeType = favicons.mimeType
  }

  return `export default ${JSON.stringify(icons, null, 2)}`
}

function genConfig ({ config }) {
  const { version } = require('../../package.json')
  const { siteUrl, siteName, titleTemplate } = config

  return `export default ${JSON.stringify({
    siteUrl,
    siteName,
    titleTemplate,
    version
  }, null, 2)}`
}

function genRoutes (app) {
  const { pages, notFoundComponent } = app.routerData
  let res = `import NotFound from ${JSON.stringify(notFoundComponent)}\n\n`

  res += `export const routes = [${pages.map(page => {
    const component = JSON.stringify(page.component)
    const chunkName = JSON.stringify('component--' + slugify(page.name || page.chunkName))
    const props = []

    props.push(`    path: ${JSON.stringify(page.route || page.path)}`)
    props.push(`    component: () => import(/* webpackChunkName: ${chunkName} */ ${component})`)

    if (page.pageQuery.query) {
      props.push(`    meta: { data: true }`)
    }

    if (page.name) {
      props.unshift(`    name: ${JSON.stringify(page.name)}`)
    }

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n\n`

  res += `export { NotFound }\n\n`

  return res
}

function genPlugins (app, isServer) {
  const plugins = app.config.plugins
    .filter(entry => {
      return (
        entry.entries.clientEntry &&
        entry.server === isServer
      )
    }).map(entry => ({
      name: ['plugin', snakeCase(path.isAbsolute(entry.use)
        ? path.relative(app.context, entry.use) || 'project'
        : entry.use), entry.index].join('_'),
      entry: entry.entries.clientEntry,
      options: entry.clientOptions || entry.options
    }))

  let res = ''

  plugins.forEach(({ name, entry }) => {
    res += `import ${name} from ${JSON.stringify(entry)}\n`
  })

  res += `\nexport default [${plugins.map(({ name, options }) => {
    const props = []

    props.push(`    run: ${name}`)
    props.push(`    options: ${JSON.stringify(options)}`)

    return `\n  {\n${props.join(',\n')}\n  }`
  }).join(',')}\n]\n`

  return res
}
