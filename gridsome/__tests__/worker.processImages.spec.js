const path = require('path')
const fs = require('fs-extra')
const imageSize = require('probe-image-size')
const AssetsQueue = require('../lib/app/queue/AssetsQueue')
const ImageProcessQueue = require('../lib/app/queue/ImageProcessQueue')
const { process: processImages } = require('../lib/workers/image-processor')
const targetDir = path.join(__dirname, 'assets', 'static')
const assetsDir = path.join(targetDir, 'assets')
const pathPrefix = '/'

beforeEach(() => (ImageProcessQueue.uid = 0))
afterAll(() => fs.remove(targetDir))

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

test('do not upscale images', async () => {
  const files = await process(['350x250.png'], { width: 500 })
  const { type, width, height } = imageSize.sync(files[0].buffer)

  expect(type).toEqual('png')
  expect(width).toEqual(350)
  expect(height).toEqual(250)
})

async function process (filenames, options = {}) {
  const config = {
    pathPrefix,
    targetDir,
    assetsDir,
    maxImageWidth: 1000,
    imageExtensions: ['.jpg', '.png', '.svg', '.gif', '.webp']
  }
  const testAssetsDir = path.join(__dirname, 'assets')
  const processQueue = new AssetsQueue({ context: __dirname, config })

  const files = await Promise.all(filenames.map(async filename => {
    const filePath = path.join(testAssetsDir, filename)
    return processQueue.add(filePath, options)
  }))

  await processImages({ queue: processQueue.images.queue, outDir: assetsDir })

  return Promise.all(files.map(({ filePath, src }) => {
    const destPath = path.join(assetsDir, src)
    const buffer = fs.readFileSync(destPath)

    return { filePath, destPath, buffer }
  }))
}
