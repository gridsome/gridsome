const path = require('path')
const crypto = require('crypto')
const { reduce } = require('lodash')

class ProcessQueue {
  constructor (service) {
    this.service = service
    this._queue = new Map()
  }

  get queue () {
    return Array.from(this._queue.values())
  }

  add (filePath, options = {}) {
    if (process.env.NODE_ENV === 'development') {
      const query = createOptionsQuery(options)
      return `/___asset?path=${encodeURIComponent(filePath)}&${query}`
    }

    const { cacheKey, name, ext } = this.preProcess(filePath, options)
    const { config: { assetsDir }} = this.service
    const destination = `${assetsDir}/static/${name}-${cacheKey}${ext}`

    if (!this._queue.has(cacheKey)) {
      this._queue.set(cacheKey, { filePath, destination, cacheKey, options })
    }

    return `/${destination}`
  }

  preProcess (filePath, options) {
    const hash = crypto.createHash('md5')
    const { name, ext } = path.parse(filePath)
    const string = filePath + JSON.stringify(options)
    const cacheKey = hash.update(string).digest('hex')

    return { cacheKey, name, ext }
  }
}

function createOptionsQuery (options) {
  return reduce(options, (values, value, key) => {
    return (values.push(`${key}=${value}`), values)
  }, []).join('&')
}

module.exports = ProcessQueue
