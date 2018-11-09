const path = require('path')
const fs = require('fs-extra')
const { mapValues } = require('lodash')
const { createWorker } = require('../../workers')

module.exports = ({ context, config, queue }) => {
  const assetsDir = path.relative(config.targetDir, config.assetsDir)
  const worker = createWorker('image-processor')

  return async (req, res, next) => {
    const options = mapValues(req.query, value => {
      return decodeURIComponent(value)
    })

    const relPath = req.params[1].replace(/(%2e|\.){2}/g, '')
    const filePath = path.join(context, relPath)

    if (
      !filePath.startsWith(context) ||
      !fs.existsSync(filePath)
    ) {
      return res.sendStatus(404)
    }

    const { ext } = path.parse(filePath)
    let asset

    try {
      asset = await queue.add(filePath, options)
    } catch (err) {
      return next(err)
    }

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
      if (asset.type === 'image') {
        const destPath = path.join(
          config.cacheDir,
          assetsDir,
          asset.cacheKey + ext
        )

        if (!fs.existsSync(destPath)) {
          await worker.processImage({
            minWidth: config.minProcessImageWidth,
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
