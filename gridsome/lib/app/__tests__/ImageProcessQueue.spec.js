const path = require('path')
const fs = require('fs-extra')
const AssetsQueue = require('../queue/AssetsQueue')
const ImageProcessQueue = require('../queue/ImageProcessQueue')
const context = path.resolve(__dirname, '../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const pathPrefix = '/'

const baseconfig = {
  pathPrefix,
  imagesDir,
  outDir: context,
  imageExtensions: ['.jpg', '.png', '.webp'],
  maxImageWidth: 1000
}

beforeEach(() => (ImageProcessQueue.uid = 0))
afterAll(() => fs.remove(imagesDir))

test('generate srcset for image', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(2)
  expect(result.type).toEqual('image')
  expect(result.mimeType).toEqual('image/png')
  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/static/1000x600.97c148e.test.png')
  expect(result.sizes).toEqual('(max-width: 1000px) 100vw, 1000px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toMatchSnapshot()
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600.82a2fbd.test.png')
  expect(result.sets[0].destPath).toEqual(path.join(imagesDir, '1000x600.82a2fbd.test.png'))
  expect(result.sets[0].width).toEqual(480)
  expect(result.sets[0].height).toEqual(288)
  expect(result.sets[1].src).toEqual('/assets/static/1000x600.97c148e.test.png')
  expect(result.sets[1].destPath).toEqual(path.join(imagesDir, '1000x600.97c148e.test.png'))
  expect(result.sets[1].width).toEqual(1000)
  expect(result.sets[1].height).toEqual(600)
  expect(result.srcset[0]).toEqual('/assets/static/1000x600.82a2fbd.test.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600.97c148e.test.png 1000w')
})

test('encode src', async () => {
  const filePath = path.resolve(context, 'assets/folder name/350 250.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/static/350%20250.096da6d.test.png')
  expect(result.sets[0].src).toEqual('/assets/static/350%20250.096da6d.test.png')
  expect(result.sets[0].destPath).toEqual(path.join(imagesDir, '350 250.096da6d.test.png'))
  expect(result.srcset[0]).toEqual('/assets/static/350%20250.096da6d.test.png 350w')
})

test('encode src in serve mode', async () => {
  const filePath = path.resolve(context, 'assets/folder name/350 250.png')
  const queue = new AssetsQueue({ context, config: baseconfig })
  const mode = process.env.GRIDSOME_MODE

  process.env.GRIDSOME_MODE = 'serve'

  const result = await queue.add(filePath)

  process.env.GRIDSOME_MODE = mode

  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/static/assets/folder%20name/350%20250.png?width=350')
  expect(result.sets[0].src).toEqual('/assets/static/assets/folder%20name/350%20250.png?width=350')
  expect(result.sets[0].destPath).toEqual(path.join(imagesDir, 'assets/folder name/350 250.png?width=350'))
  expect(result.srcset[0]).toEqual('/assets/static/assets/folder%20name/350%20250.png?width=350 350w')
})

test('generate srcset for image with path prefix', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const config = { ...baseconfig, pathPrefix: '/site-art' }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/site-art/assets/static/1000x600.97c148e.test.png')
  expect(result.sets[0].src).toEqual('/site-art/assets/static/1000x600.82a2fbd.test.png')
  expect(result.sets[1].src).toEqual('/site-art/assets/static/1000x600.97c148e.test.png')
  expect(result.sets[1].destPath).toEqual(path.join(imagesDir, '1000x600.97c148e.test.png'))
  expect(result.srcset[0]).toEqual('/site-art/assets/static/1000x600.82a2fbd.test.png 480w')
  expect(result.srcset[1]).toEqual('/site-art/assets/static/1000x600.97c148e.test.png 1000w')
})

test('resize image by width attribute', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { width: 300 })

  expect(queue.images.queue).toHaveLength(1)
  expect(result.src).toEqual('/assets/static/1000x600.6b65613.test.png')
  expect(result.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600.6b65613.test.png')
  expect(result.sets[0].width).toEqual(300)
  expect(result.sets[0].height).toEqual(180)
  expect(result.srcset[0]).toEqual('/assets/static/1000x600.6b65613.test.png 300w')
})

test('resize image by width and height attribute', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { width: 500, height: 500 })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/assets/static/1000x600.95a5738.test.png')
  expect(result.sizes).toEqual('(max-width: 500px) 100vw, 500px')
  expect(result.sets[0].src).toEqual('/assets/static/1000x600.59e52ae.test.png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600.95a5738.test.png')
})

test('disable blur filter', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { blur: '0' })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.dataUri).toMatchSnapshot()
})

test('set custom quality', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { quality: 10 })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/assets/static/1000x600.6bbe610.test.png')
})

test('set custom blur', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { blur: 10 })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/assets/static/1000x600.248ba3a.test.png')
})

test('add custom attributes to markup', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, {
    classNames: ['test-1', 'test-2'],
    alt: 'Alternative text',
    height: '100'
  })

  expect(queue.images.queue).toHaveLength(2)

  expect(result.imageHTML).toMatch(/test-1/)
  expect(result.imageHTML).toMatch(/test-2/)
  expect(result.imageHTML).toMatch(/height=\"100\"/)
  expect(result.imageHTML).toMatch(/alt=\"Alternative text\"/)

  expect(result.noscriptHTML).toMatch(/test-1/)
  expect(result.noscriptHTML).toMatch(/test-2/)
  expect(result.noscriptHTML).toMatch(/height=\"100\"/)
  expect(result.noscriptHTML).toMatch(/alt=\"Alternative text\"/)
})

test('respect config.maxImageWidth', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const config = { ...baseconfig, maxImageWidth: 600 }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/assets/static/1000x600.bd6740a.test.png')
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600.82a2fbd.test.png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600.bd6740a.test.png')
  expect(result.srcset[0]).toEqual('/assets/static/1000x600.82a2fbd.test.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600.bd6740a.test.png 600w')
})

test('use all image sizes', async () => {
  const filePath = path.resolve(context, 'assets/2560x2560.png')
  const config = { ...baseconfig, maxImageWidth: 2560 }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(4)
  expect(result.src).toEqual('/assets/static/2560x2560.42db587.test.png')
  expect(result.sets).toHaveLength(4)
  expect(result.srcset).toHaveLength(4)
})

test('use custom image sizes', async () => {
  const filePath = path.resolve(context, 'assets/2560x2560.png')
  const config = { ...baseconfig, maxImageWidth: 2560 }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath, { sizes: [480, 1024] })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.src).toEqual('/assets/static/2560x2560.cbab2cf.test.png')
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
})

test('do not resize if image is too small', async () => {
  const filePath = path.resolve(context, 'assets/350x250.png')
  const config = { ...baseconfig, maxImageWidth: 600 }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath, { width: 600 })

  expect(queue.images.queue).toHaveLength(1)
  expect(result.src).toEqual('/assets/static/350x250.096da6d.test.png')
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
})

test('get url for server in serve mode', async () => {
  const relPath = 'assets/1000x600.png'
  const absPath = path.resolve(context, relPath)
  const config = { ...baseconfig, maxImageWidth: 500 }
  const queue = new AssetsQueue({ config, context: context })
  const mode = process.env.GRIDSOME_MODE

  process.env.GRIDSOME_MODE = 'serve'

  const result = await queue.add(absPath)
  const result2 = await queue.add(absPath, { quality: 50, width: 200 })

  process.env.GRIDSOME_MODE = mode

  expect(queue.images.queue).toHaveLength(0)
  expect(result.src).toEqual('/assets/static/assets/1000x600.png?width=500')
  expect(result2.src).toEqual('/assets/static/assets/1000x600.png?width=200&quality=50')
})

test('get queue values', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(2)
})

test('disable lazy loading', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { immediate: true })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toEqual('')
})

test('skip srcset and dataUri', async () => {
  const filePath = path.resolve(context, 'assets/1000x600.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { srcset: false })

  expect(queue.images.queue).toHaveLength(2)
  expect(result.srcset).toBeUndefined()
  expect(result.dataUri).toBeUndefined()
  expect(result.sizes).toBeUndefined()
  expect(result.imageHTML).toMatchSnapshot()
})

test('handle external image urls', async () => {
  const filePath = 'https://www.example.com/assets/images/image.png'
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(0)
  expect(result.type).toEqual('image')
  expect(result.src).toEqual(filePath)
  expect(result.filePath).toEqual(filePath)
  expect(result.mimeType).toEqual('image/png')
})

test('handle absolute image paths outside context', async () => {
  const filePath = '/assets/images/image.png'
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.images.queue).toHaveLength(0)
  expect(result.type).toEqual('image')
  expect(result.src).toEqual(filePath)
  expect(result.filePath).toEqual(filePath)
  expect(result.mimeType).toEqual('image/png')
})

test('fail if file is missing', async () => {
  const filePath = path.resolve(context, 'assets/1000x600-missing.png')
  const queue = new AssetsQueue({ context, config: baseconfig })

  expect(queue.add(filePath, { srcset: false })).rejects.toThrow(/was not found/)
})
