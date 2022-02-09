const path = require('path')
const fs = require('fs-extra')
const pMap = require('p-map')
const sharp = require('sharp')
const colorString = require('color-string')
const sysinfo = require('../utils/sysinfo')

exports.processImage = async function ({
  width,
  height,
  filePath,
  destPath,
  imagesConfig,
  options = {}
}) {
  if (fs.existsSync(destPath)) {
    return
  }

  await fs.ensureDir(path.dirname(destPath))

  const { ext } = path.parse(filePath)
  const { backgroundColor, defaultQuality = 75 } = imagesConfig

  if (['.png', '.jpeg', '.jpg', '.webp'].includes(ext.toLowerCase())) {
    const config = {
      pngCompressionLevel: parseInt(options.pngCompressionLevel, 10) || 9,
      quality: parseInt(options.quality, 10) || defaultQuality,
      width: parseInt(options.width, 10) || null,
      height: parseInt(options.height, 10) || null,
      jpegProgressive: true
    }

    const compress = imagesConfig.compress !== false && config.quality < 100

    const pipeline = sharp()
    const readStream = fs.createReadStream(filePath)
    const writeStream = fs.createWriteStream(destPath)

    readStream.pipe(pipeline).pipe(writeStream)

    // Rotate based on EXIF Orientation tag
    pipeline.rotate()

    if (
      (config.width && config.width <= width) ||
      (config.height && config.height <= height)
    ) {
      const resizeOptions = {}

      if (config.height) resizeOptions.height = config.height
      if (config.width) resizeOptions.width = config.width
      if (options.fit) resizeOptions.fit = sharp.fit[options.fit]
      if (options.position) resizeOptions.position = sharp.position[options.position]
      if (options.background && colorString.get(options.background)) {
        resizeOptions.background = options.background
      } else if (backgroundColor) {
        resizeOptions.background = backgroundColor
      }

      pipeline.resize(resizeOptions)
    }

    if (compress) {
      if (/\.png$/.test(ext)) {
        pipeline.png({
          compressionLevel: config.pngCompressionLevel,
          quality: config.quality
        })
      }

      if (/\.jpe?g$/.test(ext)) {
        pipeline.jpeg({
          progressive: config.jpegProgressive,
          quality: config.quality,
          mozjpeg: true
        })
      }

      if (/\.webp$/.test(ext)) {
        pipeline.webp({
          quality: config.quality
        })
      }
    }

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        const stats = await fs.stat(filePath)
        const destStats = await fs.stat(destPath)

        // Ensures that the resulting file size
        // is not larger than the original file.
        if (stats.size < destStats.size) {
          await fs.copy(filePath, destPath, { overwrite: true, errorOnExist: false })
        }

        resolve()
      }).on('error', reject)
    })
  }

  await fs.copy(filePath, destPath, { overwrite: true, errorOnExist: false })
}

exports.process = async function ({ queue, context, imagesConfig }) {
  await pMap(queue, async set => {
    try {
      await exports.processImage({ ...set, imagesConfig })
    } catch (err) {
      const relPath = path.relative(context, set.filePath)
      throw new Error(`Failed to process image ${relPath}. ${err.message}`)
    }
  }, {
    concurrency: sysinfo.cpus.logical
  })
}
