const utils = require('loader-utils')

module.exports = async function (source, map) {
  const callback = this.async()

  const { queue } = process.GRIDSOME
  const options = utils.parseQuery(this.query || '?')

  let asset

  try {
    asset = await queue.add(this.resourcePath, options)
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
