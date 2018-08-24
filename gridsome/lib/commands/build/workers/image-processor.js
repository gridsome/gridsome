const path = require('path')
const fs = require('fs-extra')

exports.process = async function ({ queue, outDir }) {
  queue.map(({ filePath, destination }) => {
    const destPath = path.resolve(outDir, destination)

    // TODO: generate thumbnail and responsive sizes

    try {
      fs.copySync(filePath, destPath)
    } catch (err) {
      throw new Error(`Failed to process:\n${filePath}`)
    }
  })
}
