const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminWebp = require('imagemin-webp')
const imageminPngquant = require('imagemin-pngquant')
const imageminJpegoptim = require('imagemin-jpegoptim')
const { createBundleRenderer } = require('vue-server-renderer')

sharp.simd(true)

exports.processImage = async function ({
  filePath,
  destPath,
  size,
  options = {},
  minWidth = 500,
  resizeImage = false
}) {
  const { ext } = path.parse(filePath)
  let buffer = fs.readFileSync(filePath)

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
    if (isJpeg) plugins.push(imageminJpegoptim({ max: quality }))

    buffer = await pipeline.toBuffer()
    buffer = await imagemin.buffer(buffer, { plugins })
  }

  try {
    fs.outputFileSync(destPath, buffer)
  } catch (err) {
    throw new Error(`Failed to process image:\n${filePath}`)
  }
}

exports.processImages = async function ({ queue, outDir, minWidth }) {
  return Promise.all(queue.map(data => {
    const destPath = path.resolve(outDir, data.destination)
    return exports.processImage({ destPath, minWidth, ...data })
  }))
}

exports.renderHtml = async function ({
  pages,
  templatePath,
  clientManifestPath,
  serverBundlePath
}) {
  const template = fs.readFileSync(templatePath, 'utf-8')
  const clientManifest = require(clientManifestPath)
  const serverBundle = require(serverBundlePath)

  const renderer = createBundleRenderer(serverBundle, {
    inject: false,
    runInNewContext: false,
    clientManifest,
    template
  })

  for (let i = 0, l = pages.length; i < l; i++) {
    const page = pages[i]

    const context = {
      url: page.path,
      queryResults: {
        data: {}
      }
    }

    if (page.hasData) {
      context.queryResults = require(`${page.output}/data.json`)
    }

    try {
      const html = await renderer.renderToString(context)
      fs.outputFileSync(`${page.output}/index.html`, html)
    } catch (err) {
      throw err
    }
  }
}
