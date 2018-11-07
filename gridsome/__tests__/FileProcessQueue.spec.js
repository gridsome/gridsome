const path = require('path')
const fs = require('fs-extra')
const AssetsQueue = require('../lib/app/queue/AssetsQueue')
const targetDir = path.join(__dirname, 'assets', 'static')
const assetsDir = path.join(targetDir, 'assets')
const context = assetsDir
const pathPrefix = '/'

const baseconfig = {
  imageExtensions: ['.png'],
  pathPrefix,
  targetDir,
  assetsDir
}

test('generate src for file', async () => {
  const filePath = path.resolve(__dirname, 'assets/dummy.pdf')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(result.type).toEqual('file')
  expect(result.filePath).toEqual(filePath)
  expect(result.mimeType).toEqual('application/pdf')
  expect(result.src).toEqual('/assets/files/dummy.pdf')
})

test('generate src for file with base path', async () => {
  const filePath = path.resolve(__dirname, 'assets/dummy.pdf')
  const config = { ...baseconfig, pathPrefix: '/base/path' }
  const queue = new AssetsQueue({ context, config })

  const result = await queue.add(filePath)

  expect(result.src).toEqual('/base/path/assets/files/dummy.pdf')
})

test('generate src with hash', async () => {
  const filePath = path.resolve(__dirname, 'assets/dummy.pdf')
  const queue = new AssetsQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { hash: true })

  expect(result.src).toEqual('/assets/files/dummy.test.pdf')
})
