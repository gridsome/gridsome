const path = require('path')
const crypto = require('crypto')

class ProcessQueue {
  constructor (service) {
    this.service = service
    this.queue = []
  }

  add (filePath) {
    if (process.env.NODE_ENV === 'development') {
      return `/___asset?path=${encodeURIComponent(filePath)}`
    }

    // TODO: measure image size with calipers

    const { name, ext } = path.parse(filePath)
    const hash = crypto.createHash('md5').update(filePath).digest('hex')
    const { config: { assetsDir }} = this.service
    const destination = `${assetsDir}/static/${name}-${hash}${ext}`

    this.queue.push({ filePath, destination })

    return `/${destination}`
  }
}

module.exports = ProcessQueue
