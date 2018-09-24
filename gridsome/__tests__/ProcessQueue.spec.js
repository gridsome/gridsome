const path = require('path')
const ProcessQueue = require('../lib/utils/ProcessQueue')

beforeEach(() => (ProcessQueue.uid = 0))

test('generate srcset for image', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath)

  expect(result.type).toEqual('png')
  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/static/1000x600-1000.png')
  expect(result.sizes).toEqual('(max-width: 1000px) 100vw, 1000px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toMatchSnapshot()
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-480.png')
  expect(result.sets[0].width).toEqual(480)
  expect(result.sets[0].height).toEqual(288)
  expect(result.sets[0].type).toEqual('png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600-1000.png')
  expect(result.sets[1].width).toEqual(1000)
  expect(result.sets[1].height).toEqual(600)
  expect(result.sets[1].type).toEqual('png')
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-480.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600-1000.png 1000w')
})

test('resize image by width attribute', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { width: 300 })

  expect(result.src).toEqual('/assets/static/1000x600-300.png')
  expect(result.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-300.png')
  expect(result.sets[0].width).toEqual(300)
  expect(result.sets[0].height).toEqual(180)
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-300.png 300w')
})

test('disable blur filter', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { blur: '0' })

  expect(result.dataUri).toMatchSnapshot()
})

test('respect config.maxImageWidth', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 600 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath)

  expect(result.src).toEqual('/assets/static/1000x600-600.png')
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-480.png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600-600.png')
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-480.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600-600.png 600w')
})

test('do not resize if image is too small', async () => {
  const filePath = path.resolve(__dirname, 'assets/350x250.png')
  const config = { assetsDir: 'assets', maxImageWidth: 600 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { width: 600 })

  expect(result.src).toEqual('/assets/static/350x250-350.png')
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
})

test('get url for server in serve mode', async () => {
  const relPath = 'assets/1000x600.png'
  const absPath = path.resolve(__dirname, relPath)
  const config = { assetsDir: 'assets', maxImageWidth: 500 }
  const queue = new ProcessQueue({ config, context: __dirname })
  const mode = process.env.GRIDSOME_MODE

  process.env.GRIDSOME_MODE = 'serve'

  const result = await queue.add(absPath)

  process.env.GRIDSOME_MODE = mode

  expect(result.src).toEqual(`/static/${relPath}?width=500`)
})

test('get queue values', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  await queue.add(filePath)
  const values = queue.queue

  expect(values).toHaveLength(2)
})

test('disable lazy loading', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { immediate: true })

  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toEqual('')
})

test('skip srcset and dataUri', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { srcset: false })

  expect(result.srcset).toBeUndefined()
  expect(result.dataUri).toBeUndefined()
  expect(result.sizes).toBeUndefined()
  expect(result.cacheKey).toBeUndefined()
  expect(result.imageHTML).toMatchSnapshot()
})

test('skip missing files', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600-missing.png')
  const config = { assetsDir: 'assets', maxImageWidth: 1000 }
  const queue = new ProcessQueue({ config })

  const result = await queue.add(filePath, { srcset: false })

  expect(result.src).toBeNull()
  expect(result.dataUri).toBeNull()
  expect(result.cacheKey).toBeNull()
  expect(result.sets).toHaveLength(0)
  expect(result.srcset).toHaveLength(0)
  expect(result.sizes.width).toBeNull()
  expect(result.sizes.height).toBeNull()
})
