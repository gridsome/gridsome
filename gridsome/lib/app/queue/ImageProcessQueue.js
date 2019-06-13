const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const crypto = require('crypto')
const mime = require('mime-types')
const colorString = require('color-string')
const md5File = require('md5-file/promise')
const imageSize = require('probe-image-size')
const svgDataUri = require('mini-svg-data-uri')
const { forwardSlash } = require('../../utils')
const { warmupSharp } = require('../../utils/sharp')

class ImageProcessQueue {
  constructor ({ context, config }) {
    this.context = context
    this.config = config
    this._queue = new Map()
  }

  get queue () {
    return Array.from(this._queue.values())
  }

  async add (filePath, options = {}) {
    const asset = await this.preProcess(filePath, options)

    if (process.env.GRIDSOME_MODE === 'serve') {
      return asset
    }

    asset.sets.forEach(({ filename, destPath, width }) => {
      if (!this._queue.has(destPath + asset.cacheKey)) {
        this._queue.set(destPath + asset.cacheKey, {
          options: { ...options, width },
          cacheKey: asset.cacheKey,
          size: asset.size,
          destPath,
          filename,
          filePath
        })
      }
    })

    return asset
  }

  async preProcess (filePath, options = {}) {
    const { imageExtensions, outDir, pathPrefix, maxImageWidth } = this.config
    const imagesDir = path.relative(outDir, this.config.imagesDir)
    const relPath = path.relative(this.context, filePath)
    const { name, ext } = path.parse(filePath)
    const mimeType = mime.lookup(filePath)

    if (!imageExtensions.includes(ext)) {
      throw new Error(
        `${ext} is not a supported image format. ` +
        `Supported extensions are ${imageExtensions.join(', ')}.`
      )
    }

    if (!await fs.exists(filePath)) {
      throw new Error(`${filePath} was not found.`)
    }

    const hash = await md5File(filePath)
    const buffer = await fs.readFile(filePath)
    const { width, height } = imageSize.sync(buffer)

    const imageWidth = Math.min(
      parseInt(options.width || width, 10),
      maxImageWidth,
      width
    )

    const imageHeight = options.height !== undefined
      ? parseInt(options.height, 10)
      : Math.ceil(height * (imageWidth / width))

    const allSizes = options.sizes || [480, 1024, 1920, 2560]
    const imageSizes = allSizes.filter(size => size <= imageWidth)

    if (
      (imageSizes.length === 1 && imageSizes[0] <= imageWidth) ||
      (imageSizes.length === 0)
    ) {
      if (imageWidth <= maxImageWidth) {
        imageSizes.push(imageWidth)
      }
    }

    // validate color string
    if (options.background && !colorString.get(options.background)) {
      options.background = this.config.imageBackgroundColor
    } else if (this.config.imageBackgroundColor) {
      options.background = this.config.imageBackgroundColor
    }

    const createDestPath = (filename, imageOptions) => {
      if (process.env.GRIDSOME_MODE === 'serve') {
        const query = '?' + createOptionsQuery(imageOptions)
        return path.join('/', imagesDir, forwardSlash(relPath)) + query
      }

      return path.join(imagesDir, filename)
    }

    const sets = imageSizes.map((width = imageWidth) => {
      const height = Math.ceil(imageHeight * (width / imageWidth))
      const imageOptions = { ...options, width }

      if (options.height !== undefined) {
        imageOptions.height = height
      }

      const arr = this.createImageOptions(imageOptions)
      const filename = this.createFileName(filePath, arr, hash)
      const relPath = createDestPath(filename, arr)
      const destPath = path.join(this.config.outDir, relPath)
      const src = encodeURI(forwardSlash(path.join(pathPrefix || '/', relPath)))

      return { filename, destPath, src, width, height }
    })

    const results = {
      src: sets[sets.length - 1].src,
      size: { width: imageWidth, height: imageHeight },
      cacheKey: genHash(filePath + hash + JSON.stringify(options)),
      noscriptHTML: '',
      imageHTML: '',
      name,
      ext,
      hash,
      sets
    }

    const classNames = (options.classNames || []).concat(['g-image'])
    const isSrcset = options.srcset !== false
    const isLazy = options.immediate === undefined

    if (isSrcset) {
      results.dataUri = await createDataUri(buffer, mimeType, imageWidth, imageHeight, options)
      results.sizes = options.sizes || `(max-width: ${imageWidth}px) 100vw, ${imageWidth}px`
      results.srcset = results.sets.map(({ src, width }) => `${src} ${width}w`)
    }

    if (isLazy && isSrcset) {
      classNames.push('g-image--lazy')

      results.noscriptHTML = '' +
        `<noscript>` +
        `<img class="${classNames.join(' ')} g-image--loaded" ` +
        `src="${results.src}" width="${results.size.width}"` +
        (options.height ? ` height="${options.height}"` : '') +
        (options.alt ? ` alt="${options.alt}">` : '>') +
        `</noscript>`

      classNames.push('g-image--loading')
    }

    results.imageHTML = '' +
      `<img class="${classNames.join(' ')}" ` +
      `src="${isLazy ? results.dataUri || results.src : results.src}" ` +
      `width="${results.size.width}"` +
      (options.height ? ` height="${options.height}"` : '') +
      (options.alt ? ` alt="${options.alt}"` : '') +
      (isLazy && isSrcset ? ` data-srcset="${results.srcset.join(', ')}"` : '') +
      (isLazy && isSrcset ? ` data-sizes="${results.sizes}"` : '') +
      (isLazy && isSrcset ? ` data-src="${results.src}">` : '>')

    return results
  }

  createImageOptions (options) {
    const imageOptions = []

    if (options.width) {
      imageOptions.push({ key: 'width', shortKey: 'w', value: options.width })
    }

    if (options.height) {
      imageOptions.push({ key: 'height', shortKey: 'h', value: options.height })
    }

    if (options.quality) {
      imageOptions.push({ key: 'quality', shortKey: 'q', value: options.quality })
    }

    if (options.fit) {
      imageOptions.push({ key: 'fit', shortKey: 'f-', value: options.fit })
    }

    if (options.position) {
      imageOptions.push({ key: 'position', shortKey: 'p-', value: options.position })
    }

    if (options.background) {
      imageOptions.push({ key: 'background', shortKey: 'b-', value: options.background })
    }

    if (options.blur) {
      imageOptions.push({ key: 'blur', shortKey: 'bl-', value: options.blur })
    }

    return imageOptions
  }

  createFileName (relPath, arr, hash) {
    const { name, ext } = path.parse(relPath)
    const string = arr.length ? createOptionsQuery(arr) : ''

    const optionsHash = genHash(string).substr(0, 7)
    const contentHash = !process.env.GRIDSOME_TEST
      ? hash.substr(0, 7)
      : 'test'

    return `${name}.${optionsHash}.${contentHash}${ext}`
  }
}

ImageProcessQueue.uid = 0

function genHash (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

function createOptionsQuery (arr) {
  return arr.reduce((values, { key, value }) => {
    return (values.push(`${key}=${encodeURIComponent(value)}`), values)
  }, []).join('&')
}

async function createDataUri (buffer, type, width, height, options = {}) {
  const blur = options.blur !== undefined ? parseInt(options.blur, 10) : 40
  const resizeOptions = {}

  if (options.fit) resizeOptions.fit = sharp.fit[options.fit]
  if (options.position) resizeOptions.position = sharp.position[options.position]
  if (options.background) resizeOptions.background = options.background

  return svgDataUri(
    `<svg fill="none" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    (blur > 0 ? await createBlurSvg(buffer, type, width, height, blur, resizeOptions) : '') +
    `</svg>`
  )
}

async function createBlurSvg (buffer, mimeType, width, height, blur, resize = {}) {
  const blurWidth = 64
  const blurHeight = Math.round(height * (blurWidth / width))
  const warmSharp = await warmupSharp(sharp)
  const blurBuffer = await warmSharp(buffer).resize(blurWidth, blurHeight, resize).toBuffer()
  const base64 = blurBuffer.toString('base64')
  const id = `__svg-blur-${ImageProcessQueue.uid++}`

  return '' +
    '<defs>' +
    `<filter id="${id}">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}"/>` +
    `</filter>` +
    '</defs>' +
    `<image x="0" y="0" filter="url(#${id})" width="${width}" height="${height}" xlink:href="data:${mimeType};base64,${base64}" />`
}

// async function createTracedSvg (buffer, type, width, height) {
//   // TODO: traced svg fallback
//   if (!/(jpe?g|png|bmp)/.test(type)) {
//     return svgDataUri(
//       `<svg fill="none" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"/>`
//     )
//   }

//   return new Promise((resolve, reject) => {
//     potrace.trace(buffer, (err, svg) => {
//       if (err) reject(err)
//       else resolve(svgDataUri(svg))
//     })
//   })
// }

module.exports = ImageProcessQueue
