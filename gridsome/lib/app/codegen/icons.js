const path = require('path')
const fs = require('fs-extra')
const isRelative = require('is-relative')

async function genIcons ({ config, context, assets }) {
  const { touchicon, favicon } = config.icon
  const touchiconPath = iconPath(context, touchicon.src)
  const faviconPath = iconPath(context, favicon.src)

  const icons = {
    touchiconMimeType: null,
    faviconMimeType: null,
    precomposed: false,
    touchicons: [],
    favicons: []
  }

  if (await fs.exists(touchiconPath)) {
    const touchicons = await assets.add(touchiconPath, {
      imageWidths: touchicon.sizes,
      srcset: false
    })

    icons.precomposed = touchicon.precomposed
    icons.touchicons = touchicons.sets.map(iconData)
    icons.touchiconMimeType = touchicons.mimeType
  }

  if (await fs.exists(faviconPath)) {
    const favicons = await assets.add(faviconPath, {
      imageWidths: favicon.sizes,
      srcset: false
    })

    icons.favicons = favicons.sets.map(iconData)
    icons.faviconMimeType = favicons.mimeType
  }

  return `export default ${JSON.stringify(icons, null, 2)}`
}

function iconPath (context, src) {
  return isRelative(src)
    ? path.join(context, src)
    : src
}

function iconData (set) {
  return {
    width: set.width,
    height: set.height,
    src: set.src
  }
}

module.exports = genIcons
