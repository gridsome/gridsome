const path = require('path')

const {
  createPolyfillScript,
  inlineCriticalCSS
} = require('../lib/inline')

test('inline critical css', async () => {
  const filePath = path.join(__dirname, 'index.html')
  const html = await inlineCriticalCSS(filePath, {
    css: 'a{color:red;}'
  })

  expect(html).toMatchSnapshot()
})

test('inline critical css with polyfill', async () => {
  const filePath = path.join(__dirname, 'index.html')
  const html = await inlineCriticalCSS(filePath, {
    polyfill: createPolyfillScript(),
    css: 'a{color:red;}'
  })

  expect(html).toMatchSnapshot()
})
