const path = require('path')
const fs = require('fs-extra')
const isUrl = require('is-url')
const { trim } = require('lodash')
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
    let asset

    try {
      asset = await this.preProcess(filePath, options)
    } catch (err) {
      throw err
    }

    if (process.env.GRIDSOME_MODE === 'serve') {
      return asset
    }

    if (!this._queue.has(asset.src)) {
      this._queue.set(asset.src, {
        destination: trim(asset.src, '/'),
        filePath
      })
    }

    return asset
  }

  async preProcess (filePath, options) {
    if (!await fs.exists(filePath)) {
      throw new Error(`${filePath} was not found. `)
    }

    const { targetDir, pathPrefix } = this.config
    const assetsDir = path.relative(targetDir, this.config.assetsDir)
    const relPath = path.relative(this.context, filePath)

    let filename = ''

    if (process.env.GRIDSOME_MODE === 'serve') {
      filename = forwardSlash(relPath)
    } else {
      const { name, ext } = path.parse(relPath)
      let urlHash = ''
      
      if (options.hash) {
        const hash = await md5File(filePath)
        urlHash = `.${!process.env.GRIDSOME_TEST ? hash : 'test'}`
      }

      filename = `${name}${urlHash}${ext}`
    }

    return {
      src: forwardSlash(path.join(pathPrefix, assetsDir, 'files', filename))
    }
  }
}

module.exports = FileProcessQueue
