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

  const { ext } = path.parse(filePath)
  const { backgroundColor, defaultQuality = 75 } = imagesConfig

  const buffer = await fs.readFile(filePath)

  if (['.png', '.jpeg', '.jpg', '.webp'].includes(ext.toLowerCase())) {
    const config = {
      pngCompressionLevel: parseInt(options.pngCompressionLevel, 10) || 9,
      quality: parseInt(options.quality, 10) || defaultQuality,
      width: parseInt(options.width, 10) || null,
      height: parseInt(options.height, 10) || null,
      jpegProgressive: true
    }

    const sharpImage = sharp(buffer)
    const compress = imagesConfig.compress !== false && config.quality < 100

    // Rotate based on EXIF Orientation tag
    sharpImage.rotate()

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

      sharpImage.resize(resizeOptions)
    }

    if (compress) {
      if (/\.png$/.test(ext)) {
        sharpImage.png({
          compressionLevel: config.pngCompressionLevel,
          quality: config.quality
        })
      }

      if (/\.jpe?g$/.test(ext)) {
        sharpImage.jpeg({
          progressive: config.jpegProgressive,
          quality: config.quality,
          mozjpeg: true
        })
      }

      if (/\.webp$/.test(ext)) {
        sharpImage.webp({
          quality: config.quality
        })
      }
    }

    const sharpBuffer = await sharpImage.toBuffer()
    const sharpLength = Buffer.byteLength(sharpBuffer)
    const initLength = Buffer.byteLength(buffer)

    return fs.outputFile(
      destPath,
      sharpLength < initLength
        ? sharpBuffer
        : buffer
    )
  }

  return fs.outputFile(destPath, buffer)
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
