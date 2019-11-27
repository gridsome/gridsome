const utils = require('loader-utils')

module.exports = async function (source, map) {
  const callback = this.async()

  const { assets } = process.GRIDSOME
  const options = utils.parseQuery(this.query || '?')

  if (typeof options.imageWidths === 'string') {
    options.imageWidths = options.imageWidths.split(',').map(Number)
  }
  if (typeof options.blur !== 'undefined') {
    options.blur = parseInt(options.blur, 10)
  }
  if (typeof options.width !== 'undefined') {
    options.width = parseInt(options.width, 10)
  }
  if (typeof options.height !== 'undefined') {
    options.height = parseInt(options.height, 10)
  }
  if (typeof options.quality !== 'undefined') {
    options.quality = parseInt(options.quality, 10)
  }

  let asset

  try {
    asset = await assets.add(this.resourcePath, options)
  } catch (err) {
    callback(err, source, map)
    return
  }

  this.dependency(this.resourcePath)

  const res = {
    type: asset.type,
    mimeType: asset.mimeType,
    src: asset.src
  }

  // required properties for g-image
  if (asset.type === 'image') {
    res.size = asset.size
    res.sizes = asset.sizes
    res.srcset = asset.srcset
    res.dataUri = asset.dataUri
  }

  callback(null, `module.exports = ${JSON.stringify(res)}`)
}
