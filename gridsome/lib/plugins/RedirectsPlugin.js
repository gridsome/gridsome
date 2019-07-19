const path = require('path')
const slash = require('slash')

class RedirectsPlugin {
  constructor ({ _app: { hooks, config } }) {
    const { outDir, publicPath, pathPrefix, redirects = [] } = config

    hooks.redirects.tap('RedirectsPlugin', (res, renderQueue) => {
      for (const entry of renderQueue) {
        const relative = path.relative(outDir, entry.htmlOutput)
        const dirname = path.dirname(relative)
        const url = dirname === '.' ? '/' : `/${slash(dirname)}`

        if (entry.path !== '/' && entry.path !== url) {
          res.push({
            from: pathPrefix + entry.path,
            to: publicPath + relative,
            status: 200
          })
        }
      }

      for (const entry of redirects) {
        res.push({
          from: pathPrefix + entry.from,
          to: publicPath + entry.to,
          status: entry.status || 301
        })
      }

      return res
    })
  }
}

module.exports = RedirectsPlugin
