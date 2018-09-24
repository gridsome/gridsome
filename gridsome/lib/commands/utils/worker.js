const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminWebp = require('imagemin-webp')
const createRenderFn = require('./createRenderFn')
const imageminPngquant = require('imagemin-pngquant')
const imageminJpegoptim = require('imagemin-jpegoptim')

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
    if (isJpeg) plugins.push(imageminJpegoptim({ max: config.quality }))

    buffer = await pipeline.toBuffer()
    buffer = await imagemin.buffer(buffer, { plugins })
  }

  return fs.outputFileSync(destPath, buffer)
}

exports.processImages = async function ({ queue, outDir, minWidth }) {
  return Promise.all(queue.map(data => {
    const destPath = path.resolve(outDir, data.destination)
    return exports.processImage({ destPath, minWidth, ...data })
  }))
}

exports.renderHtml = async function ({
  pages,
  cacheDir,
  htmlTemplate,
  clientManifestPath,
  serverBundlePath
}) {
  const render = createRenderFn({
    htmlTemplate,
    clientManifestPath,
    serverBundlePath
  })

  for (let i = 0, l = pages.length; i < l; i++) {
    try {
      const page = pages[i]
      const { data } = page.hasData
        ? require(`${cacheDir}/data${page.path}.json`)
        : { data: {}}

      const html = await render(page.path, data)

      fs.outputFileSync(`${page.output}/index.html`, html)
    } catch (err) {
      throw err
    }
  }
}
