const path = require('path')
const fs = require('fs-extra')
const micromatch = require('micromatch')

const normalize = p => p.replace(/\/+$/, '') || '/'

module.exports = function (api, options) {
  const include = options.include.map(normalize)
  const exclude = options.exclude.map(normalize)
  const staticUrls = []

  exclude.push('/404') // allways exclude /404 page

  if (process.env.NODE_ENV !== 'production') {
    return
  }

  api.createPages(async ({ graphql }) => {
    if (typeof options.staticUrls === 'function') {
      const urls = await options.staticUrls({ graphql })
      if (Array.isArray(urls)) {
        staticUrls.push(...urls)
      } else {
        throw new Error('The staticUrls option must return an array.')
      }
    } else if (Array.isArray(options.staticUrls)) {
      staticUrls.push(...options.staticUrls)
    }
  })

  api.afterBuild(async ({ queue, config }) => {
    if (!config.siteUrl) {
      throw new Error(`Sitemap plugin is missing a required siteUrl config.`)
    }

    const patterns = Object.keys(options.config).map(key => ({
      pattern: normalize(key),
      key
    }))

    const filename = path.join(config.outputDir, options.output)
    const pathPrefix = config.pathPrefix !== '/' ? config.pathPrefix : ''

    let pages = queue.filter(page => page.type ? page.type === 'static' : true)

    if (include.length) {
      pages = pages.filter(page => micromatch(page.path, include).length > 0)
    }

    if (exclude.length) {
      pages = pages.filter(page => micromatch(page.path, exclude).length < 1)
    }

    console.log(`Generate ${options.output} (${pages.length + staticUrls.length} pages)`)

    const generatedUrls = pages.map(page => {
      const pattern = patterns.find(p => micromatch.isMatch(page.path, p.pattern))
      const urlConfig = pattern ? options.config[pattern.key] : {}
      const url = page.publicPath || `${page.path}/`.replace(/\/+$/, '/')

      return {
        url: url.startsWith(pathPrefix)
          ? url.substr(pathPrefix.length)
          : url,
        priority: urlConfig.priority,
        changefreq: urlConfig.changefreq,
        lastmod: urlConfig.lastmod
      }
    })

    const sitemap = require('sitemap').createSitemap({
      hostname: normalize(config.siteUrl) + pathPrefix,
      cacheTime: options.cacheTime,
      urls: [...generatedUrls, ...staticUrls]
    })

    await fs.outputFile(filename, sitemap.toString())
  })
}

module.exports.defaultOptions = () => ({
  output: '/sitemap.xml',
  cacheTime: 600000,
  staticUrls: [],
  include: [],
  exclude: [],
  config: {}
})
