const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const imagemin = require('imagemin')
const colorString = require('color-string')
const imageminWebp = require('imagemin-webp')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')

sharp.simd(true)

exports.processImage = async function ({
  size,
  filePath,
  destPath,
  cachePath,
  options = {},
  backgroundColor = null
}) {
  if (cachePath && await fs.exists(cachePath)) {
    return fs.copy(cachePath, destPath)
  }

  const { ext } = path.parse(filePath)
  let buffer = await fs.readFile(filePath)

  if (['.png', '.jpeg', '.jpg', '.webp'].includes(ext)) {
    const config = {
      pngCompressionLevel: parseInt(options.pngCompressionLevel, 10) || 9,
      quality: parseInt(options.quality, 10) || 75,
      width: parseInt(options.width, 10),
      height: parseInt(options.height, 10),
      jpegProgressive: true
    }

    const plugins = []
    let pipeline = sharp(buffer)

    if (config.width && config.width <= size.width) {
      const ratio = size.height / size.width
      const height = Math.round(config.width * ratio)
      const resizeOptions = {}

      if (options.fit) resizeOptions.fit = sharp.fit[options.fit]
      if (options.position) resizeOptions.position = sharp.position[options.position]
      if (options.background && colorString.get(options.background)) {
        resizeOptions.background = options.background
      } else if (backgroundColor) {
        resizeOptions.background = backgroundColor
      }

      pipeline = pipeline.resize(config.width, height, resizeOptions)
    }

    if (/\.png$/.test(ext)) {
      const quality = config.quality / 100

      pipeline = pipeline.png({
        compressionLevel: config.pngCompressionLevel,
        adaptiveFiltering: false
      })
      plugins.push(imageminPngquant({
        quality: [quality, quality]
      }))
    }

    if (/\.jpe?g$/.test(ext)) {
      pipeline = pipeline.jpeg({
        progressive: config.jpegProgressive,
        quality: config.quality
      })
      plugins.push(imageminMozjpeg({
        progressive: config.jpegProgressive,
        quality: config.quality
      }))
    }

    if (/\.webp$/.test(ext)) {
      pipeline = pipeline.webp({
        quality: config.quality
      })
      plugins.push(imageminWebp({
        quality: config.quality
      }))
    }

    buffer = await pipeline.toBuffer()
    buffer = await imagemin.buffer(buffer, { plugins })
  }

  await fs.outputFile(destPath, buffer)
}

exports.process = async function ({ queue, cacheDir, backgroundColor }) {
  return Promise.all(queue.map(set => {
    const cachePath = cacheDir ? path.join(cacheDir, set.filename) : null

    return exports.processImage({
      destPath: set.destPath,
      backgroundColor,
      cachePath,
      ...set
    })
  }))
}
