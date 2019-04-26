const path = require('path')
const fs = require('fs-extra')
const { mapValues } = require('lodash')
const { createWorker } = require('../../workers')
const { SUPPORTED_IMAGE_TYPES } = require('../../utils/constants')

module.exports = ({ context, config, queue }) => {
  const worker = createWorker('image-processor')

  return async (req, res, next) => {
    const relPath = req.params[1].replace(/(%2e|\.){2}/g, '')
    const filePath = path.join(context, relPath)
    const asset = queue.get(filePath)

    if (
      !filePath.startsWith(context) ||
      !fs.existsSync(filePath) ||
      !asset
    ) {
      return res.sendStatus(404)
    }

    const { ext } = path.parse(filePath)
    const options = mapValues(req.query, value => {
      return decodeURIComponent(value)
    })

    const serveFile = async file => {
      const buffer = await fs.readFile(file)

      if (process.env.NODE_ENV === 'development') {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
        res.header('Pragma', 'no-cache')
        res.header('Expires', '-1')
      }

      res.contentType(ext)
      res.end(buffer, 'binary')
    }

    try {
      if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
        const imageOptions = queue.images.createImageOptions(options)
        const filename = queue.images.createFileName(filePath, imageOptions, asset.hash)
        const destPath = path.join(config.imageCacheDir, filename)

        if (!fs.existsSync(destPath)) {
          await worker.processImage({
            backgroundColor: config.images.backgroundColor,
            size: asset.size,
            filePath,
            destPath,
            options
          })
        }

        serveFile(destPath)
      } else {
        serveFile(filePath)
      }
    } catch (err) {
      next(err)
    }
  }
}
