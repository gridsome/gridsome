const path = require('path')
const fs = require('fs-extra')
const { mapValues } = require('lodash')
const { createWorker } = require('../../workers')

module.exports = ({ context, config, queue }) => {
  const assetsDir = path.relative(config.targetDir, config.assetsDir)
  const worker = createWorker('image-processor')
  const minWidth = config.minProcessImageWidth

  return async (req, res, next) => {
    const options = mapValues(req.query, value => {
      return decodeURIComponent(value)
    })

    const relPath = req.params[0].replace(/(%2e|\.){2}/g, '')
    const filePath = path.join(context, relPath)

    if (
      !filePath.startsWith(context) ||
      !fs.existsSync(filePath)
    ) {
      return res.sendStatus(404)
    }

    const { ext } = path.parse(filePath)
    let data

    try {
      data = await queue.preProcess(filePath, options)
    } catch (err) {
      return next(err)
    }

    const { cacheKey, size } = data
    const destPath = path.resolve(config.cacheDir, assetsDir, cacheKey + ext)
    const args = { filePath, destPath, minWidth, options, size }

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

    if (fs.existsSync(destPath)) {
      return serveFile(destPath)
    }

    try {
      await worker.processImage(args)
      serveFile(destPath)
    } catch (err) {
      next(err)
    }
  }
}
