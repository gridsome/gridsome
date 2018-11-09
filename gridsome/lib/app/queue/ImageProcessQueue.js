const path = require('path')
const fs = require('fs-extra')
const sharp = require('sharp')
const isUrl = require('is-url')
const crypto = require('crypto')
const { trim } = require('lodash')
const mime = require('mime-types')
const md5File = require('md5-file/promise')
const imageSize = require('probe-image-size')
const svgDataUri = require('mini-svg-data-uri')
const { forwardSlash } = require('../../utils')

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
    let asset

    try {
      asset = await this.preProcess(filePath, options)
    } catch (err) {
      throw err
    }

    if (process.env.GRIDSOME_MODE === 'serve') {
      return asset
    }

    asset.sets.forEach(({ src, width }) => {
      if (!this._queue.has(src + asset.cacheKey)) {
        this._queue.set(src + asset.cacheKey, {
          options: { ...options, width },
          destination: trim(src, '/'),
          cacheKey: asset.cacheKey,
          size: asset.size,
          filePath
        })
      }
    })

    return asset
  }

  async preProcess (filePath, options = {}) {
    const { ext } = path.parse(filePath)
    const { imageExtensions } = this.config

    if (!imageExtensions.includes(ext)) {
      throw new Error(
        `${ext} is not a supported image format. ` +
        `Supported extensions are ${imageExtensions.join(', ')}.`
      )
    }

    if (isUrl(filePath)) {
      return {
        src: filePath,
        sets: []
      }
    }

    if (!await fs.exists(filePath)) {
      throw new Error(`${filePath} was not found. `)
    }

    const hash = await md5File(filePath)
    const buffer = await fs.readFile(filePath)
    const { width, height } = imageSize.sync(buffer)
    const { targetDir, pathPrefix, maxImageWidth } = this.config
    const assetsDir = path.relative(targetDir, this.config.assetsDir)
    const mimeType = mime.lookup(filePath)

    const imageWidth = Math.min(
      parseInt(options.width, 10) || width,
      maxImageWidth,
      width
    )

    const imageHeight = Math.ceil(height * (imageWidth / width))
    const imageSizes = (options.sizes || [480, 1024, 1920, 2560]).filter(size => {
      return size <= maxImageWidth && size <= imageWidth
    })

    if (
      (imageSizes.length === 1 && imageSizes[0] <= imageWidth) ||
      (imageSizes.length === 0)
    ) {
      if (imageWidth <= maxImageWidth) {
        imageSizes.push(imageWidth)
      }
    }

    const createSrcPath = (srcWidth = maxImageWidth) => {
      const relPath = path.relative(this.context, filePath)
      const imageOptions = []
      let filename = ''

      imageOptions.push({
        key: 'width',
        shortKey: 'w',
        value: srcWidth
      })

      if (options.quality) {
        imageOptions.push({
          key: 'quality',
          shortKey: 'q',
          value: options.quality
        })
      }

      if (process.env.GRIDSOME_MODE === 'serve') {
        const query = createOptionsQuery(imageOptions)
        filename = `${forwardSlash(relPath)}?${query}`
      } else {
        const { name, ext } = path.parse(relPath)
        const urlHash = !process.env.GRIDSOME_TEST ? hash : 'test'
        const string = createOptionsString(imageOptions)
        filename = `${name}-${string}.${urlHash}${ext}`
      }

      return forwardSlash(path.join(pathPrefix, assetsDir, 'static', filename))
    }

    const sets = imageSizes.map(width => {
      const height = Math.ceil(imageHeight * (width / imageWidth))
      return { src: createSrcPath(width), width, height }
    })

    const results = {
      type: 'image',
      filePath,
      mimeType,
      src: sets[sets.length - 1].src,
      size: { width: imageWidth, height: imageHeight },
      cacheKey: genHash(filePath + hash + JSON.stringify(options)),
      noscriptHTML: '',
      imageHTML: '',
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
}

ImageProcessQueue.uid = 0

function genHash (string) {
  return crypto.createHash('md5').update(string).digest('hex')
}

function createOptionsQuery (options) {
  return options.reduce((values, { key, value }) => {
    return (values.push(`${key}=${encodeURIComponent(value)}`), values)
  }, []).join('&')
}

function createOptionsString (options) {
  return options.reduce((values, { shortKey, value }) => {
    return (values.push(`${shortKey}${encodeURIComponent(value)}`), values)
  }, []).join('-')
}

async function createDataUri (buffer, type, width, height, options = {}) {
  const blur = options.blur !== undefined ? parseInt(options.blur, 10) : 40

  return svgDataUri(
    `<svg fill="none" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` +
    (blur > 0 ? await createBlurSvg(buffer, type, width, height, blur) : '') +
    `</svg>`
  )
}

async function createBlurSvg (buffer, mimeType, width, height, blur) {
  const blurWidth = 64
  const blurHeight = Math.round(height * (blurWidth / width))
  const blurBuffer = await sharp(buffer).resize(blurWidth, blurHeight).toBuffer()
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
