const path = require('path')
const fs = require('fs-extra')
const imagemin = require('imagemin')
const imageminWebp = require('imagemin-webp')
const imageminPngquant = require('imagemin-pngquant')
const { createBundleRenderer } = require('vue-server-renderer')
const Calipers = require('calipers')('png', 'jpeg')

exports.processImage = async function ({
  filePath,
  destPath,
  minWidth = 500,
  resizeImage = false
}) {
  const supportedExtensions = ['.png', '.jpeg', '.jpg']
  const { ext } = path.parse(filePath)
  let buffer = fs.readFileSync(filePath)

  if (supportedExtensions.includes(ext)) {
    const size = await measure(filePath)
    let resize

    if (resizeImage && size.width >= minWidth) {
      const ratio = size.height / size.width
      const width = minWidth
      const height = Math.round(width * ratio)

      resize = { width, height }
    }

    buffer = await imagemin.buffer(buffer, {
      plugins: [
        imageminWebp({ quality: 75, resize }),
        imageminPngquant({ quality: 75 })
      ]
    })
  }

  try {
    fs.outputFileSync(destPath, buffer)
  } catch (err) {
    throw new Error(`Failed to process image:\n${filePath}`)
  }
}

exports.processImages = async function ({ queue, outDir, minWidth }) {
  return Promise.all(queue.map(({ filePath, destination }) => {
    const destPath = path.resolve(outDir, destination)
    return exports.processImage({ filePath, destPath, minWidth })
  }))
}

exports.renderHtml = async function ({
  pages,
  templatePath,
  clientManifestPath,
  serverBundlePath
}) {
  const template = fs.readFileSync(templatePath, 'utf-8')
  const clientManifest = require(clientManifestPath)
  const serverBundle = require(serverBundlePath)

  const renderer = createBundleRenderer(serverBundle, {
    inject: false,
    runInNewContext: false,
    clientManifest,
    template
  })

  for (let i = 0, l = pages.length; i < l; i++) {
    const page = pages[i]

    const context = {
      url: page.path,
      title: 'Gridsome',
      lang: 'en',
      state: {}
    }

    if (page.hasData) {
      context.queryResults = require(`${page.output}/data.json`)
    }

    try {
      const html = await renderer.renderToString(context)
      fs.outputFileSync(`${page.output}/index.html`, html)
    } catch (err) {
      throw err
    }
  }
}

function measure (filePath) {
  return new Promise((resolve, reject) => {
    Calipers.measure(filePath, (err, result) => {
      if (err) reject(err)
      else resolve(result.pages[0])
    })
  })
}

