const path = require('path')
const fs = require('fs-extra')
const md5File = require('md5-file/promise')
const { forwardSlash } = require('../../utils')

class FileProcessQueue {
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

    if (!this._queue.has(asset.src)) {
      this._queue.set(asset.src, {
        destPath: asset.destPath,
        filePath
      })
    }

    return asset
  }

  async preProcess (filePath) {
    if (!await fs.exists(filePath)) {
      throw new Error(`${filePath} was not found. `)
    }

    const { outputDir, pathPrefix } = this.config
    const filesDir = path.relative(outputDir, this.config.filesDir)
    const relPath = path.relative(this.context, filePath)

    let filename = ''

    if (process.env.GRIDSOME_MODE === 'serve') {
      filename = forwardSlash(relPath)
    } else {
      const { name, ext } = path.parse(relPath)
      const hash = await md5File(filePath)
      const urlHash = `.${!process.env.GRIDSOME_TEST ? hash : 'test'}`

      filename = `${name}${urlHash}${ext}`
    }

    const src = forwardSlash(path.join(pathPrefix || '/', filesDir, filename))
    const destPath = process.env.GRIDSOME_MODE !== 'serve'
      ? path.join(this.config.filesDir, filename)
      : undefined

    return {
      src: encodeURI(src),
      destPath
    }
  }
}

module.exports = FileProcessQueue
