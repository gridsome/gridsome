const fs = require('fs-extra')

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

module.exports = genIcons
