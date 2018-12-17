const fs = require('fs-extra')
const path = require('path')
const build = require('../lib/build')
const context = path.join(__dirname, '__fixtures__', 'project-basic')

afterAll(async () => {
  await fs.remove(path.join(context, 'dist'))
  await fs.remove(path.join(context, 'src', '.temp'))
  await fs.remove(path.join(context, '.cache'))
})

test('build basic project', async () => {
  const { config } = await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))

  expect(config.siteName).toEqual('Gridsome')

  const indexHTML = content('dist/index.html')

  expect(indexHTML).toMatch('Gridsome | Test')
  expect(indexHTML).toMatch('data-server-rendered="true"')
  expect(indexHTML).toMatch('name="keywords" content="test"')
  expect(indexHTML).toMatch('name="og:title" content="bar"')
  expect(indexHTML).toMatch('name="og:description" content="Test Value"')
  expect(indexHTML).toMatch('<h2>Test Value</h2>')
  expect(indexHTML).toMatch('<span>string from custom schema</span>')
  expect(indexHTML).toMatch('<span>Test Value</span>')
  expect(indexHTML).toMatch('<span>bar</span>')
  expect(indexHTML).toMatch('<span>test 1</span>')
  expect(indexHTML).toMatch('<span>test 2</span>')
  expect(indexHTML).toMatch('<span>test 3</span>')
  expect(indexHTML).toMatch('<a href="/blog">Blog</a>')
  expect(indexHTML).toMatch('test-active')

  // 404.html
  expect(exists('dist/404.html')).toBeTruthy()
  expect(content('dist/404.html')).toMatch('Custom 404 - not found')
  expect(content('dist/404.html')).toMatch('string from custom schema')

  // favicon
  expect(exists('dist/assets/static/favicon-w32.test.png')).toBeTruthy()

  // g-image
  expect(exists('dist/assets/static/test-w1000.test.png')).toBeTruthy()
  expect(exists('dist/assets/static/test-w480.test.png')).toBeTruthy()
  expect(indexHTML).toMatch('src="data:image/svg+xml')
  expect(indexHTML).toMatch('alt="Test image"')
  expect(indexHTML).toMatch('data-srcset="/assets/static/test-w480.test.png 480w')
  expect(indexHTML).toMatch('src="/assets/static/test-w1000.test.png"')

  // g-link (file)
  expect(indexHTML).toMatch('<a href="/blog">Blog</a>')
  expect(indexHTML).toMatch('<a href="/assets/files/dummy.pdf">Download</a>')
  expect(exists('dist/assets/files/dummy.pdf')).toBeTruthy()

  // pagination
  expect(exists('dist/blog/index.html')).toBeTruthy()
  expect(exists('dist/blog/2/index.html')).toBeTruthy()
  expect(content('dist/blog/index.html')).toMatch('href="/blog"')
  expect(content('dist/blog/index.html')).toMatch('href="/blog/2"')
  expect(content('dist/blog/index.html')).toMatch('<span>Third post</span>')
  expect(content('dist/blog/index.html')).toMatch('<a href="/blog/third-post">Read more</a>')
  expect(content('dist/blog/index.html')).toMatch('<span>Second post</span>')
  expect(content('dist/blog/index.html')).toMatch('<a href="/blog/second-post">Read more</a>')
  expect(content('dist/blog/2/index.html')).toMatch('<span>First post</span>')
  expect(content('dist/blog/2/index.html')).toMatch('<a href="/blog/first-post">Read more</a>')

  // templates
  expect(exists('dist/blog/first-post/index.html')).toBeTruthy()
  expect(content('dist/blog/first-post/index.html')).toMatch('<h1>First post</h1>')
  expect(exists('dist/blog/second-post/index.html')).toBeTruthy()
  expect(content('dist/blog/second-post/index.html')).toMatch('<h1>Second post</h1>')
  expect(exists('dist/blog/third-post/index.html')).toBeTruthy()
  expect(content('dist/blog/third-post/index.html')).toMatch('<h1>Third post</h1>')
}, 15000)
