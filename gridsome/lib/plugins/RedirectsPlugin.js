const path = require('path')
const slash = require('slash')

class RedirectsPlugin {
  constructor ({ _app: { hooks, config } }) {
    const { outDir, redirects = [] } = config

    hooks.redirects.tap('RedirectsPlugin', (res, renderQueue) => {
      for (const entry of renderQueue) {
        const relative = path.relative(outDir, entry.htmlOutput)
        const dirname = slash(path.dirname(relative))
        const url = dirname === '.' ? '/' : `/${dirname}`

        if (entry.path !== '/' && entry.path !== url) {
          res.push({
            from: entry.path,
            to: `/${slash(relative)}`,
            status: 200
          })
        }
      }

      return res.concat(redirects)
    })
  }
}

module.exports = RedirectsPlugin
