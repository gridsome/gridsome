const path = require('path')
const fs = require('fs-extra')
const imageSize = require('probe-image-size')
const ImageProcessQueue = require('../lib/app/ImageProcessQueue')
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
  const testAssetsDir = path.join(__dirname, 'assets')
  const config = { pathPrefix, targetDir, assetsDir, maxImageWidth: 1000 }
  const processQueue = new ImageProcessQueue({ config })

  const files = await Promise.all(filenames.map(async filename => {
    const filePath = path.join(testAssetsDir, filename)
    return processQueue.add(filePath, options)
  }))

  await processImages({ queue: processQueue.queue, outDir: assetsDir })

  return Promise.all(files.map(({ filePath, src }) => {
    const destPath = path.join(assetsDir, src)
    const buffer = fs.readFileSync(destPath)

    return { filePath, destPath, buffer }
  }))
}
