const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')
const { reduce, trim } = require('lodash')
const imageSize = require('probe-image-size')
const svgDataUri = require('mini-svg-data-uri')
// const md5File = require('md5-file')

class ProcessQueue {
  constructor ({ context, config }) {
    this.context = context
    this.config = config
    this._queue = new Map()
  }

  get queue () {
    return Array.from(this._queue.values())
  }

  async add (filePath, options = {}) {
    const data = await this.preProcess(filePath, options)

    if (process.env.GRIDSOME_MODE === 'serve') {
      return data
    }

    data.sets.forEach(({ src, width }) => {
      if (!this._queue.has(src + data.cacheKey)) {
        this._queue.set(src + data.cacheKey, {
          options: { ...options, width },
          destination: trim(src, '/'),
          cacheKey: data.cacheKey,
          size: data.size,
          filePath
        })
      }
    })

    return data
  }

  async preProcess (filePath, options = {}) {
    if (!fs.existsSync(filePath)) {
      return {
        src: null,
        sets: [],
        srcset: [],
        dataUri: null,
        cacheKey: null,
        sizes: { width: null, height: null }
      }
    }

    const hash = crypto.createHash('md5')
    const buffer = fs.readFileSync(filePath)
    const string = filePath + JSON.stringify(options)
    const { type, width, height } = imageSize.sync(buffer)
    const { assetsDir, maxImageWidth } = this.config

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
      const { name, ext } = path.parse(filePath)
      let src = ''

      if (process.env.GRIDSOME_MODE === 'serve') {
        const query = { width: srcWidth }
        const relPath = path.relative(this.context, filePath)
        src = `/static/${relPath}?${createOptionsQuery(query)}`
      } else {
        src = '/' + path.join(assetsDir, `static/${name}-${srcWidth}${ext}`)
      }

      return src
    }

    const sets = imageSizes.map(width => {
      const height = Math.ceil(imageHeight * (width / imageWidth))
      return { src: createSrcPath(width), width, height, type }
    })

    const result = {
      src: sets[sets.length - 1].src,
      size: { width: imageWidth, height: imageHeight },
      filePath,
      type,
      sets
    }

    if (options.srcset !== false) {
      result.cacheKey = hash.update(string).digest('hex')
      result.dataUri = await createDataUri(buffer, type, imageWidth, imageHeight, options)
      result.sizes = options.sizes || `(max-width: ${imageWidth}px) 100vw, ${imageWidth}px`
      result.srcset = result.sets.map(({ src, width }) => `${src} ${width}w`)
    }

    return result
  }
}

ProcessQueue.uid = 0

function createOptionsQuery (options) {
  return reduce(options, (values, value, key) => {
    return (values.push(`${key}=${encodeURIComponent(value)}`), values)
  }, []).join('&')
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

async function createBlurSvg (buffer, type, width, height, blur) {
  const blurWidth = 64
  const blurHeight = Math.round(height * (blurWidth / width))
  const blurBuffer = await sharp(buffer).resize(blurWidth, blurHeight).toBuffer()
  const base64 = blurBuffer.toString('base64')
  const id = `__svg-blur-${ProcessQueue.uid++}`

  return '' +
    `<filter id="${id}">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" />` +
    `</filter>` +
    `<image x="0" y="0" filter="url(#${id})" width="${width}" height="${height}" xlink:href="data:image/${type};base64,${base64}" />`
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

module.exports = ProcessQueue
