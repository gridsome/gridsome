const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminWebp = require('imagemin-webp')
const imageminPngquant = require('imagemin-pngquant')
const imageminJpegoptim = require('imagemin-jpegoptim')

sharp.simd(true)

exports.processImage = async function ({
  filePath,
  destPath,
  cachePath,
  size,
  options = {},
  minWidth = 500,
  resizeImage = false
}) {
  if (cachePath && await fs.exists(cachePath)) {
    return fs.copy(cachePath, destPath)
  } else if (await fs.exists(destPath)) {
    return // image is already processed
  }

  const { ext } = path.parse(filePath)
  let buffer = await fs.readFile(filePath)

  if (['.png', '.jpeg', '.jpg', '.webp'].includes(ext)) {
    const config = {
      pngCompressionLevel: parseInt(options.pngCompressionLevel, 10) || 9,
      quality: parseInt(options.quality, 10) || 75,
      width: parseInt(options.width, 10),
      jpegProgressive: true
    }

    const isPng = /\.png$/.test(ext)
    const isJpeg = /\.jpe?g$/.test(ext)
    const isWebp = /\.webp$/.test(ext)

    let pipeline = sharp(buffer)

    if (config.width && config.width <= size.width) {
      const ratio = size.height / size.width
      const height = Math.round(config.width * ratio)

      pipeline = pipeline.resize(config.width, height)
    }

    if (isPng) {
      pipeline = pipeline.png({
        compressionLevel: config.pngCompressionLevel,
        adaptiveFiltering: false
      })
    }

    if (isJpeg) {
      pipeline = pipeline.jpeg({
        progressive: config.jpegProgressive,
        quality: config.quality
      })
    }

    if (isWebp) {
      pipeline = pipeline.webp({
        quality: config.quality
      })
    }

    const plugins = []

    if (isPng) plugins.push(imageminPngquant({ quality: config.quality }))
    if (isWebp) plugins.push(imageminWebp({ quality: config.quality }))
    if (isJpeg) plugins.push(imageminJpegoptim({ max: config.quality }))

    buffer = await pipeline.toBuffer()
    buffer = await imagemin.buffer(buffer, { plugins })
  }

  await fs.outputFile(destPath, buffer)
}

exports.process = async function ({ queue, outDir, cacheDir, minWidth }) {
  return Promise.all(queue.map(set => {
    const cachePath = cacheDir ? path.join(cacheDir, set.filename) : null
    const destPath = path.join(outDir, set.destination)

    return exports.processImage({
      cachePath,
      destPath,
      minWidth,
      ...set
    })
  }))
}
