const path = require('path')
const fs = require('fs-extra')
const imageSize = require('probe-image-size')
const AssetsQueue = require('../../app/queue/AssetsQueue')
const ImageProcessQueue = require('../../app/queue/ImageProcessQueue')
const { process: processImages } = require('../image-processor')
const context = path.resolve(__dirname, '../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const imageCacheDir = path.join(context, 'assets', 'cache')
const pathPrefix = '/'

beforeEach(() => {
  ImageProcessQueue.uid = 0
})

afterEach(async () => {
  await fs.remove(imagesDir)
  await fs.remove(imageCacheDir)
})

test('process png image', async () => {
  const files = await process(['1000x600.png'])
  const { type, width, height } = imageSize.sync(files[0].buffer)
  const fromStats = await fs.stat(files[0].filePath)
  const toStats = await fs.stat(files[0].destPath)

  expect(type).toEqual('png')
  expect(width).toEqual(1000)
  expect(height).toEqual(600)
  expect(toStats.size).toBeLessThan(fromStats.size)
})

test('process jpg image', async () => {
  const files = await process(['1000x600.jpg'])
  const { type, width, height } = imageSize.sync(files[0].buffer)
  const fromStats = await fs.stat(files[0].filePath)
  const toStats = await fs.stat(files[0].destPath)

  expect(type).toEqual('jpg')
  expect(width).toEqual(1000)
  expect(height).toEqual(600)
  expect(toStats.size).toBeLessThan(fromStats.size)
})

test('process webp image', async () => {
  const files = await process(['image.webp'])
  const { type, width, height } = imageSize.sync(files[0].buffer)
  const fromStats = await fs.stat(files[0].filePath)
  const toStats = await fs.stat(files[0].destPath)

  expect(type).toEqual('webp')
  expect(width).toEqual(550)
  expect(height).toEqual(368)
  expect(toStats.size).toBeLessThan(fromStats.size)
})

test('process svg image', async () => {
  const files = await process(['logo.svg'])
  const { type, width, height } = imageSize.sync(files[0].buffer)
  const fromStats = await fs.stat(files[0].filePath)
  const toStats = await fs.stat(files[0].destPath)

  expect(type).toEqual('svg')
  expect(width).toEqual(400)
  expect(height).toEqual(400)
  expect(toStats.size).toEqual(fromStats.size)
})

test('process gif image', async () => {
  const files = await process(['logo.gif'])
  const { type, width, height } = imageSize.sync(files[0].buffer)
  const fromStats = await fs.stat(files[0].filePath)
  const toStats = await fs.stat(files[0].destPath)

  expect(type).toEqual('gif')
  expect(width).toEqual(1666)
  expect(height).toEqual(1666)
  expect(toStats.size).toEqual(fromStats.size)
})

test('resize image', async () => {
  const files = await process(['1000x600.png'], { width: 100 })
  const { type, width, height } = imageSize.sync(files[0].buffer)

  expect(type).toEqual('png')
  expect(width).toEqual(100)
  expect(height).toEqual(60)
})

test('rotate image based on EXIF', async () => {
  const files = await process(['rotated.jpg'], { width: 480 })
  const { width, height } = imageSize.sync(files[0].buffer)

  expect(width).toEqual(480)
  expect(height).toEqual(640)
})

test('crop image', async () => {
  const files = await process(['1000x600.png'], { width: 500, height: 500 })
  const { type, width, height } = imageSize.sync(files[0].buffer)

  expect(type).toEqual('png')
  expect(width).toEqual(500)
  expect(height).toEqual(500)
})

test('do not upscale images', async () => {
  const files = await process(['350x250.png'], { width: 500 })
  const { type, width, height } = imageSize.sync(files[0].buffer)

  expect(type).toEqual('png')
  expect(width).toEqual(350)
  expect(height).toEqual(250)
})

test('do not use processed image if file size gets bigger', async () => {
  const files = await process([
    'rotated.jpg',
    '1000x600.jpg',
    '350x250.png',
    '1000x600-compressed.jpg',
    '350x250-compressed.png'
  ], { quality: 100 })

  for (const file of files) {
    const originalImage = fs.statSync(file.filePath)
    const resultImage = fs.statSync(file.destPath)
    expect(resultImage.size).toBeLessThanOrEqual(originalImage.size)
  }
})

test('do not increase file size when compression is disabled', async () => {
  const files = await process([
    'rotated.jpg',
    '1000x600.jpg',
    '350x250.png',
    '1000x600-compressed.jpg',
    '350x250-compressed.png'
  ], {}, {
    images: {
      compress: false
    }
  })

  for (const file of files) {
    const originalImage = fs.statSync(file.filePath)
    const resultImage = fs.statSync(file.destPath)
    expect(resultImage.size).toBeLessThanOrEqual(originalImage.size)
  }
})

test('reuse process results', async () => {
  const source = path.join(context, 'assets', '1000x600.png')
  const result = path.join(imagesDir, '1000x600.97c148e.test.png')

  await fs.copy(source, result)

  const files = await process(['1000x600.png'], { width: 1000 })
  const sourceStats = await fs.stat(source)
  const resultStats = await fs.stat(files[0].destPath)

  const mDiff = sourceStats.mtimeMs - resultStats.mtimeMs
  const bDiff = sourceStats.birthtime - resultStats.birthtime

  expect(mDiff).toBeLessThan(32)
  expect(bDiff).toBeLessThan(32)
  expect(resultStats.size).toEqual(sourceStats.size)
})

test('ignore extension casing', async () => {
  const files = await process(['600x400-2.JPG'], { width: 500, height: 500 })
  const stats = await fs.stat(files[0].destPath)

  expect(stats.size).toBeLessThan(10000)
})

async function process (
  filenames,
  options = {},
  {
    images = {}
  } = {}
) {
  const config = {
    pathPrefix,
    imagesDir,
    outputDir: context,
    maxImageWidth: 1000,
    imageExtensions: ['.jpg', '.png', '.svg', '.gif', '.webp'],
    images: {
      process: true,
      defaultQuality: 75,
      placeholder: {
        type: 'blur',
        defaultBlur: 20
      },
      ...images
    }
  }

  const processQueue = new AssetsQueue({ context, config })

  const assets = await Promise.all(filenames.map(async filename => {
    const filePath = path.join(context, 'assets', filename)
    return processQueue.add(filePath, options)
  }))

  await processImages({
    queue: processQueue.images.queue,
    imagesConfig: config.images,
    context
  })

  return Promise.all(assets.map(async ({ filePath, src }) => {
    const destPath = path.join(context, src)
    const buffer = await fs.readFile(destPath)

    return { filePath, destPath, buffer }
  }))
}
