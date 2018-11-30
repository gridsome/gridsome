const path = require('path')
const fs = require('fs-extra')
const { generateSW } = require('workbox-build')

function PWAPlugin (api, options) {
  if (!options.icon) {
    throw new Error(`PWA manifest must have an icon`)
  }

  api.setClientOptions({
    title: options.title || api._app.config.siteName,
    serviceWorkerPath: path.join('/', options.serviceWorkerPath),
    manifestPath: path.join('/', options.manifestPath),
    statusBarStyle: options.statusBarStyle,
    themeColor: options.themeColor
  })

  api.beforeProcessAssets(async ({ context, config, queue }) => {
    console.log(`Generating ${options.manifestPath}...`)

    const manifestDest = path.join(config.outDir, options.manifestPath)
    const icon = await queue.add(path.join(context, options.icon), {
      sizes: [48, 72, 96, 144, 168, 192, 256, 512],
      srcset: false
    })

    await fs.outputFile(manifestDest, JSON.stringify({
      name: options.title || api._app.config.siteName,
      short_name: options.shortName || api._app.config.siteName,
      start_url: options.startUrl,
      display: options.display,
      theme_color: options.themeColor,
      background_color: options.backgroundColor,
      icons: icon.sets.map(set => ({
        src: set.src.substring(1),
        sizes: `${set.width}x${set.height}`,
        type: icon.mimeType
      }))
    }, null, 2))
  })

  api.afterBuild(async ({ context, config, queue }) => {
    console.log(`Generating ${options.serviceWorkerPath}...`)

    const serviceWorkerPath = path.join(config.outDir, options.serviceWorkerPath)
    const skipWaitingPath = path.join(__dirname, 'lib/skip-waiting.js')
    const skipWaiting = await fs.readFile(skipWaitingPath, 'utf8')

    await generateSW({
      swDest: serviceWorkerPath,
      globDirectory: config.outDir,
      globPatterns: ['**\/*.{js,css,html,png,jpg,jpeg,gif,svg,woff,woff2,eot,ttf,otf}'],
      globIgnores: [options.serviceWorkerPath],
      templatedUrls: queue.reduce((urls, page) => {
        const url = page.path.substring(1)
        const file = path.relative(config.outDir, page.htmlOutput)

        if (url) urls[url] = file

        return urls
      }, {})
    })

    await fs.writeFile(serviceWorkerPath, `\n${skipWaiting}`, { flag: 'a' })
  })
}

PWAPlugin.defaultOptions = () => ({
  title: '',
  startUrl: '/',
  display: 'standalone',
  statusBarStyle: 'default',
  manifestPath: 'manifest.json',
  serviceWorkerPath: 'service-worker.js',
  shortName: '',
  themeColor: '#0476F2',
  backgroundColor: '#ffffff',
  icon: ''
})

module.exports = PWAPlugin
