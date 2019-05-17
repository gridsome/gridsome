module.exports = function (api, options) {
  const path = require('path')
  const fs = require('fs-extra')
  const micromatch = require('micromatch')
  const exclude = options.exclude.slice()

  exclude.push('/404') // always exclude 404 page

  api.afterBuild(({ queue, config }) => {
    if (!config.siteUrl) {
      throw new Error(`Sitemap plugin is missing a required siteUrl config.`)
    }

    const patterns = Object.keys(options.config)
    const filename = path.join(config.outDir, options.output)
    const pathPrefix = config.pathPrefix !== '/' ? config.pathPrefix : ''
    const pages = queue.filter(page => micromatch(page.path, exclude).length < 1)
    const staticUrls = options.staticUrls || []

    console.log(`Generate ${options.output} (${pages.length + staticUrls.length} pages)`)

    const generatedUrls = pages.map(page => {
      const pattern = patterns.find(p => micromatch.isMatch(page.path, p))
      const urlConfig = options.config[pattern] || {}

      return {
        url: page.path,
        priority: urlConfig.priority,
        changefreq: urlConfig.changefreq
      }
    })

    const sitemap = require('sitemap').createSitemap({
      hostname: config.siteUrl.replace(/\/+$/, '') + pathPrefix,
      cacheTime: options.cacheTime,
      urls: [...generatedUrls, ...staticUrls]
    })

    return fs.outputFile(filename, sitemap.toString())
  })
}

module.exports.defaultOptions = () => ({
  output: '/sitemap.xml',
  cacheTime: 600000,
  exclude: [],
  config: {}
})
