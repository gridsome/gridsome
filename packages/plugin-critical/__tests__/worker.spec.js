const path = require('path')
const { processHtmlFile } = require('../lib/worker')

test('inline critical css', async () => {
  const filePath = path.join(__dirname, '__fixtures__/index-2.html')
  const html = await processHtmlFile(filePath, {
    baseDir: path.join(__dirname, '__fixtures__')
  })

  expect(html).toMatchSnapshot()
})

test('inline critical with publicPath', async () => {
  const filePath = path.join(__dirname, '__fixtures__/index-public-path.html')
  const html = await processHtmlFile(filePath, {
    baseDir: path.join(__dirname, '__fixtures__'),
    publicPath: '/path/to/subdir/',
    polyfill: false
  })

  expect(html).toMatchSnapshot()
})
