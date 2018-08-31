const path = require('path')
const fs = require('fs-extra')
const imagemin = require('imagemin')
const imageminWebp = require('imagemin-webp')
const imageminPngquant = require('imagemin-pngquant')
const { createBundleRenderer } = require('vue-server-renderer')

// sharp.simd(true)

exports.processImage = async function ({
  filePath,
  destPath,
  size,
  options = {},
  minWidth = 500,
  resizeImage = false
}) {
  const supportedExtensions = ['.png', '.jpeg', '.jpg']
  const { ext } = path.parse(filePath)
  let buffer = fs.readFileSync(filePath)

  if (supportedExtensions.includes(ext)) {
    const resizeWidth = parseInt(options.width) || minWidth
    let resize

    if (options.width) {
      resizeImage = true
    }

    if (resizeImage && size.width > resizeWidth) {
      const ratio = size.height / size.width
      const width = resizeWidth
      const height = Math.round(width * ratio)

      resize = { width, height }
    }

    buffer = await imagemin.buffer(buffer, {
      plugins: [
        imageminWebp({ quality: 80, resize }),
        imageminPngquant({ quality: 80 })
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
  return Promise.all(queue.map(data => {
    const destPath = path.resolve(outDir, data.destination)
    return exports.processImage({ destPath, minWidth, ...data })
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
      queryResults: {
        data: {}
      }
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
