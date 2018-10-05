const path = require('path')
const fs = require('fs-extra')
const slugify = require('@sindresorhus/slugify')

class CodeGenerator {
  constructor (app) {
    this.app = app

    this.files = {
      'icons.js': () => genIcons(app),
      'config.js': () => genConfig(app),
      'routes.js': () => genRoutes(app),
      'plugins.js': () => 'export default []',
      'now.js': () => `export default ${Date.now()}`
    }

    // TODO: let plugins add generated files
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

  const touchicons = await queue.add(resolve(touchicon.src), {
    sizes: touchicon.sizes,
    srcset: false
  })

  const favicons = await queue.add(resolve(favicon.src), {
    sizes: favicon.sizes,
    srcset: false
  })

  return `export default ${JSON.stringify({
    precomposed: touchicon.precomposed,
    touchicons: touchicons.sets,
    favicons: favicons.sets
  })}`
}

function genConfig ({ config }) {
  const { version } = require('../../package.json')
  const { siteUrl, siteName, pathPrefix, titleTemplate } = config

  return `export default ${JSON.stringify({
    siteUrl,
    siteName,
    pathPrefix,
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
