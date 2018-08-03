const fs = require('fs-extra')
const { createBundleRenderer } = require('vue-server-renderer')

exports.render = async function ({ pages, context }) {
  const clientManifest = require(`${context}/manifest/client.json`)
  const serverBundle = require(`${context}/manifest/server.json`)
  const templatePath = require.resolve('../../../app/index.server.html')
  const template = await fs.readFile(templatePath, 'utf-8')

  const renderer = createBundleRenderer(serverBundle, {
    inject: false,
    runInNewContext: false,
    clientManifest,
    template
  })

  for (let i = 0, l = pages.length; i < l; i++) {
    const page = pages[i]
    
    const context = {
      url: page.path,
      route: page.route,
      pageQuery: page.results,
      title: 'Gridsome',
      lang: 'en'
    }

    try {
      const html = await renderer.renderToString(context)
      fs.outputFileSync(`${page.output}/index.html`, html)
    } catch (err) {
      throw err
    }
  }
}
