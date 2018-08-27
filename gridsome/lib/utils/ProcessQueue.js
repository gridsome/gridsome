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

  add (filePath, options = {}) {
    const data = this.preProcess(filePath, options)

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

  preProcess (filePath, options) {
    const hash = crypto.createHash('md5')
    const buffer = fs.readFileSync(filePath)
    const string = filePath + JSON.stringify(options)
    const { width, height } = imageSize.sync(buffer)
    const { assetsDir, maxImageWidth } = this.config
    const imageSizes = [480, 1024, 1920, 2560].filter(size => size < width)

    if (
      (imageSizes.length === 1 && imageSizes[0] < width) ||
      (imageSizes.length === 0)
    ) {
      imageSizes.push(width)
    }

    const createSrcPath = (srcWidth = maxImageWidth) => {
      const { name, ext } = path.parse(filePath)
      let src = ''

      if (srcWidth > width) srcWidth = width

      if (process.env.NODE_ENV === 'development') {
        const query = { ...options, width: srcWidth, path: filePath }
        src = `/___asset?${createOptionsQuery(query)}`
      } else {
        src = `/${assetsDir}/static/${name}-${srcWidth}${ext}`
      }

      return src
    }

    const sets = imageSizes.map(width => ({ src: createSrcPath(width), width }))

    const result = {
      src: sets[0].src,
      dataUri: createDataUri(width, height),
      cacheKey: hash.update(string).digest('hex'),
      sizes: options.sizes || `(max-width: ${width}px) 100vw, ${width}px`,
      size: { width, height },
      sets
    }

    result.srcset = result.sets.map(({ src, width }) => `${src} ${width}w`)

    return result
  }
}

function createOptionsQuery (options) {
  return reduce(options, (values, value, key) => {
    return (values.push(`${key}=${encodeURIComponent(value)}`), values)
  }, []).join('&')
}

function createDataUri (width, height) {
  return svgDataUri(
    `<svg fill="none" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"/>`
  )
}

module.exports = ProcessQueue
