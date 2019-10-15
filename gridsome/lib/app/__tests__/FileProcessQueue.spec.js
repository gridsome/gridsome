const path = require('path')
const AssetsQueue = require('../queue/AssetsQueue')
const context = path.resolve(__dirname, '../../__tests__')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

const baseconfig = {
  imageExtensions: ['.png'],
  outputDir: context,
  pathPrefix,
  filesDir
}

test('generate src for file', async () => {
  const filePath = path.resolve(context, 'assets/dummy.pdf')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.files.queue).toHaveLength(1)
  expect(result.type).toEqual('file')
  expect(result.filePath).toEqual(filePath)
  expect(result.mimeType).toEqual('application/pdf')
  expect(result.destPath).toEqual(path.join(context, 'assets/files/dummy.test.pdf'))
  expect(result.src).toEqual('/assets/files/dummy.test.pdf')
})

test('encode src', async () => {
  const filePath = path.resolve(context, 'assets/folder name/dummy document.pdf')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(result.filePath).toEqual(filePath)
  expect(result.destPath).toEqual(path.join(context, 'assets/files/dummy document.test.pdf'))
  expect(result.src).toEqual('/assets/files/dummy%20document.test.pdf')
})

test('encode src in serve mode', async () => {
  const filePath = path.resolve(context, 'assets/folder name/dummy document.pdf')
  const queue = new AssetsQueue({ context, config: baseconfig })
  const mode = process.env.GRIDSOME_MODE

  process.env.GRIDSOME_MODE = 'serve'

  const result = await queue.add(filePath)

  process.env.GRIDSOME_MODE = mode

  expect(result.destPath).toBeUndefined()
  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/files/assets/folder%20name/dummy%20document.pdf')
})

test('generate src for file with base path', async () => {
  const filePath = path.resolve(context, 'assets/dummy.pdf')
  const config = { ...baseconfig, pathPrefix: '/base/path' }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath)

  expect(queue.files.queue).toHaveLength(1)
  expect(result.destPath).toEqual(path.join(context, 'assets/files/dummy.test.pdf'))
  expect(result.src).toEqual('/base/path/assets/files/dummy.test.pdf')
})

test('handle external file urls', async () => {
  const filePath = 'https://www.example.com/assets/files/document.pdf'
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.files.queue).toHaveLength(0)
  expect(result.type).toEqual('file')
  expect(result.destPath).toBeUndefined()
  expect(result.src).toEqual('https://www.example.com/assets/files/document.pdf')
  expect(result.mimeType).toEqual('application/pdf')
  expect(result.filePath).toEqual(filePath)
})

test('handle external file paths', async () => {
  const filePath = '/assets/files/document.pdf'
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(queue.files.queue).toHaveLength(0)
  expect(result.type).toEqual('file')
  expect(result.destPath).toBeUndefined()
  expect(result.src).toEqual('/assets/files/document.pdf')
  expect(result.mimeType).toEqual('application/pdf')
  expect(result.filePath).toEqual(filePath)
})
