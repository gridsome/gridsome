const path = require('path')
const isUrl = require('is-url')
const mime = require('mime-types')
const FileProcessQueue = require('./FileProcessQueue')
const ImageProcessQueue = require('./ImageProcessQueue')

class AssetsQueue {
  constructor (app) {
    this.app = app
    this.files = new FileProcessQueue(app)
    this.images = new ImageProcessQueue(app)

    this.index = {}
  }

  async add (filePath, options) {
    const { config, context } = this.app
    const { ext } = path.parse(filePath)
    const isImage = config.imageExtensions.includes(ext)

    const data = {
      type: isImage ? 'image' : 'file',
      mimeType: mime.lookup(filePath),
      isUrl: false,
      filePath
    }

    // TODO: process external files and images
    if (isUrl(filePath) || !filePath.startsWith(context)) {
      data.isUrl = true
      data.src = filePath

      return data
    }

    const results = isImage
      ? await this.images.add(filePath, options)
      : await this.files.add(filePath, options)

    this.index[filePath] = { ...data, ...results }

    return this.index[filePath]
  }

  get (filePath) {
    return this.index[filePath]
  }
}

module.exports = AssetsQueue
