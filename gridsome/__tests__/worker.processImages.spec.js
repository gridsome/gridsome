const path = require('path')
const fs = require('fs-extra')
const imageSize = require('probe-image-size')
const AssetsQueue = require('../lib/app/queue/AssetsQueue')
const ImageProcessQueue = require('../lib/app/queue/ImageProcessQueue')
const { process: processImages } = require('../lib/workers/image-processor')
const context = __dirname
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

test('use cached process results', async () => {
  await fs.copy(
    path.join(context, 'assets', '1000x600.png'),
    path.join(imageCacheDir, '1000x600.97c148e.test.png')
  )

  const files = await process(['1000x600.png'], { width: 1000 }, true)
  const cacheStats = await fs.stat(files[0].cachePath)
  const destStats = await fs.stat(files[0].destPath)

  const mDiff = cacheStats.mtimeMs - destStats.mtimeMs
  const bDiff = cacheStats.birthtime - destStats.birthtime

  expect(mDiff).toBeLessThan(32)
  expect(bDiff).toBeLessThan(32)
  expect(destStats.size).toEqual(cacheStats.size)
})

async function process (filenames, options = {}, withCache = false) {
  const config = {
    pathPrefix,
    imagesDir,
    outDir: context,
    maxImageWidth: 1000,
    imageExtensions: ['.jpg', '.png', '.svg', '.gif', '.webp']
  }

  const processQueue = new AssetsQueue({ context, config })

  const assets = await Promise.all(filenames.map(async filename => {
    const filePath = path.join(context, 'assets', filename)
    return processQueue.add(filePath, options)
  }))

  await processImages({
    queue: processQueue.images.queue,
    cacheDir: withCache ? imageCacheDir : false,
    outDir: context
  })

  return Promise.all(assets.map(({ filePath, src, hash }) => {
    const imageOptions = processQueue.images.createImageOptions(options)
    const filename = processQueue.images.createFileName(filePath, imageOptions, hash)
    const cachePath = path.join(imageCacheDir, filename)
    const destPath = path.join(context, src)

    const buffer = fs.readFileSync(destPath)

    return { filePath, destPath, cachePath, buffer }
  }))
}
