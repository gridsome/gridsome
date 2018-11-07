const path = require('path')
const FileProcessQueue = require('./FileProcessQueue')
const ImageProcessQueue = require('./ImageProcessQueue')

class AssetsQueue {
  constructor (app) {
    this.app = app
    this.files = new FileProcessQueue(app)
    this.images = new ImageProcessQueue(app)
  }

  add (filePath, options) {
    const { ext } = path.parse(filePath)
    const { imageExtensions } = this.app.config

    return imageExtensions.includes(ext)
      ? this.images.add(filePath, options)
      : this.files.add(filePath, options)
  }
}

module.exports = AssetsQueue
