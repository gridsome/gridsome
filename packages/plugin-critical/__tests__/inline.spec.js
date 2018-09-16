const path = require('path')
const { inlineCriticalCSS } = require('../lib/inline')

test('inline critical css', async () => {
  const filePath = path.join(__dirname, 'index.html')
  const html = await inlineCriticalCSS(filePath, 'a{color:red;}')

  expect(html).toMatchSnapshot()
})
