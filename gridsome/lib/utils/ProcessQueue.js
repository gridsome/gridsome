const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { reduce, trim } = require('lodash')
const imageSize = require('probe-image-size')
const svgDataUri = require('mini-svg-data-uri')
// const md5File = require('md5-file')

class ProcessQueue {
  constructor ({ config }) {
    this.config = config
    this._queue = new Map()
  }

  get queue () {
    return Array.from(this._queue.values())
  }

  async add (filePath, options = {}) {
    const data = await this.preProcess(filePath, options)

    if (process.env.NODE_ENV === 'development') {
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

      if (process.env.NODE_ENV === 'development') {
        const query = { width: srcWidth, path: filePath }
        src = `/___asset?${createOptionsQuery(query)}`
      } else {
        src = `/${assetsDir}/static/${name}-${srcWidth}${ext}`
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
      type,
      sets
    }

    if (options.srcset !== false) {
      result.cacheKey = hash.update(string).digest('hex')
      result.dataUri = await createDataUri(buffer, type, imageWidth, imageHeight)
      result.sizes = options.sizes || `(max-width: ${imageWidth}px) 100vw, ${imageWidth}px`,
      result.srcset = result.sets.map(({ src, width }) => `${src} ${width}w`)
    }

    return result
  }
}

function createOptionsQuery (options) {
  return reduce(options, (values, value, key) => {
    return (values.push(`${key}=${encodeURIComponent(value)}`), values)
  }, []).join('&')
}

function createDataUri (buffer, type, width, height) {
  return svgDataUri(
    `<svg fill="none" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"/>`
  )

  // TODO: traced svg fallback
  // if (!/(jpe?g|png|bmp)/.test(type)) {
  //   return svgDataUri(
  //     `<svg fill="none" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"/>`
  //   )
  // }

  // return new Promise((resolve, reject) => {
  //   potrace.trace(buffer, (err, svg) => {
  //     if (err) reject(err)
  //     else resolve(svgDataUri(svg))
  //   })
  // })
}

module.exports = ProcessQueue
