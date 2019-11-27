const path = require('path')
const fs = require('fs-extra')
const pMap = require('p-map')
const sharp = require('sharp')
const imagemin = require('imagemin')
const colorString = require('color-string')
const imageminWebp = require('imagemin-webp')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const sysinfo = require('../utils/sysinfo')
const { warmupSharp } = require('../utils/sharp')

exports.processImage = async function ({
  width,
  height,
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
      width: parseInt(options.width, 10) || null,
      height: parseInt(options.height, 10) || null,
      jpegProgressive: true
    }

    const plugins = []
    let pipeline = sharp(buffer)

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

      pipeline = pipeline.resize(resizeOptions)
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

exports.process = async function ({ queue, context, cacheDir, backgroundColor }) {
  await warmupSharp(sharp)
  await pMap(queue, async set => {
    const cachePath = cacheDir ? path.join(cacheDir, set.filename) : null

    try {
      await exports.processImage({
        destPath: set.destPath,
        backgroundColor,
        cachePath,
        ...set
      })
    } catch (err) {
      const relPath = path.relative(context, set.filePath)
      throw new Error(`Failed to process image ${relPath}. ${err.message}`)
    }
  }, {
    concurrency: sysinfo.cpus.logical
  })
}
