const fs = require('fs-extra')
const path = require('path')
const build = require('../build')

test('build basic project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-basic')
  const { config } = await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))

  expect(config.siteName).toEqual('Gridsome')

  const indexHTML = content('dist/index.html')
  const appJS = content('dist/assets/js/app.js')
  const homeJS = content('dist/assets/js/component--home.js')
  const blogIndexHTML = content('dist/blog/index.html')
  const blogPage2HTML = content('dist/blog/2/index.html')

  expect(indexHTML).toMatch('Gridsome | Test')
  expect(indexHTML).toMatch('data-server-rendered="true"')
  expect(indexHTML).toMatch('name="keywords" content="test"')
  expect(indexHTML).toMatch('name="og:title" content="bar"')
  expect(indexHTML).toMatch('name="og:description" content="Test Value"')
  expect(indexHTML).toMatch('<h2>Test Value</h2>')
  expect(indexHTML).toMatch('<span>string from custom schema</span>')
  expect(indexHTML).toMatch('<span>Test Value</span>')
  expect(indexHTML).toMatch('<span>bar</span>')
  expect(indexHTML).toMatch('<span>PROD_2</span>')
  expect(indexHTML).toMatch('<span>test 2</span>')
  expect(indexHTML).toMatch('<span>test 3</span>')
  expect(indexHTML).toMatch('<a href="/blog" class="g-link-1">Blog</a>')
  expect(indexHTML).toMatch('<a href="/" class="active--exact test-active g-link-2">Home</a>')
  expect(indexHTML).toMatch('href="http://outsidelink1.com" target="_blank" rel="noopener"')
  expect(indexHTML).toMatch('href="https://outsidelink2.com" target="_blank" rel="noopener"')
  expect(indexHTML).toMatch('href="//outsidelink3.com" target="_blank" rel="noopener"')
  expect(indexHTML).toMatch('href="https://www.gridsome.org/docs"')
  expect(indexHTML).not.toMatch('href="https://www.gridsome.org/docs" target="_blank" rel="noopener"')
  expect(indexHTML).toMatch('test-active')
  expect(indexHTML).not.toMatch('Main description')
  expect(indexHTML).toMatch('Index description')

  // Custom src/index.html template
  expect(indexHTML).toMatch('<div>custom html template</div>')

  // 404.html
  expect(exists('dist/404.html')).toBeTruthy()
  expect(content('dist/404.html')).toMatch('Custom 404 - not found')
  expect(content('dist/404.html')).toMatch('string from custom schema')

  // api.transpileDependencies
  expect(appJS).not.toMatch('testToArray1 (...args)') // transpiled
  expect(appJS).toMatch('testToArray2 (...args)') // not transpiled
  expect(appJS).not.toMatch('classTestMethod ()') // transpiled

  // transpile custom sfc blocks
  expect(appJS).not.toMatch('Component =>') // static-query
  expect(homeJS).not.toMatch('Component =>') // page-query

  // env variables
  expect(homeJS).toMatch('GRIDSOME_PROD_VARIABLE: "PROD_1"')
  expect(homeJS).toMatch('PROD_VARIABLE: process.env.PROD_VARIABLE')

  // polyfills
  expect(appJS).toMatch('// ECMAScript 6 symbols shim')

  // favicon
  expect(exists('dist/assets/static/favicon.1539b60.test.png')).toBeTruthy()

  // g-image
  expect(exists('dist/assets/static/test.82a2fbd.test.png')).toBeTruthy()
  expect(exists('dist/assets/static/test.97c148e.test.png')).toBeTruthy()
  expect(indexHTML).toMatch('name="test" content="test-meta"')
  expect(indexHTML).toMatch(' src="data:image/svg+xml')
  expect(indexHTML).toMatch('data-srcset="/assets/static/test.82a2fbd.test.png 480w')
  expect(indexHTML).toMatch('data-src="/assets/static/test.97c148e.test.png"')
  expect(indexHTML).toMatch(' src="/assets/static/test.cbab2cf.test.png"')
  expect(indexHTML).toMatch(' src="/uploads/test.png"')
  expect(indexHTML).toMatch(' src="https://www.example.com/assets/image.png"')
  expect(indexHTML).toMatch('alt="Test image"')
  expect(indexHTML).toMatch('alt="SVG logo"')
  expect(indexHTML).toMatch('alt="Immediate image"')
  expect(indexHTML).toMatch('alt="External image"')
  expect(indexHTML).toMatch('alt="Static image"')
  expect(indexHTML).toMatch('class="g-image-1 g-image')
  expect(indexHTML).toMatch('class="g-image-2 g-image')
  expect(indexHTML).toMatch('class="g-image-3 g-image')
  expect(indexHTML).not.toMatch('g-image-3-false')
  expect(indexHTML).not.toMatch('[object Object]')
  expect(indexHTML).not.toMatch('width=""')

  // #163 - remove duplicate style links
  expect(indexHTML.match(/styles\.css/g)).toHaveLength(2)

  // g-link (file)
  expect(indexHTML).toMatch('<a href="/assets/files/dummy.pdf">Download</a>')
  expect(exists('dist/assets/files/dummy.pdf')).toBeTruthy()

  // pagination
  expect(blogIndexHTML).not.toMatch('name="test" content="test-meta"')
  expect(blogIndexHTML).toMatch('href="/blog"')
  expect(blogIndexHTML).toMatch('href="/blog/2"')
  expect(blogIndexHTML).toMatch('<span>Third post</span>')
  expect(blogIndexHTML).toMatch('<a href="/blog/third-post">Read more</a>')
  expect(blogIndexHTML).toMatch('<span>Second post</span>')
  expect(blogIndexHTML).toMatch('<a href="/blog/second-post">Read more</a>')
  expect(blogPage2HTML).toMatch('<span>First post</span>')
  expect(blogPage2HTML).toMatch('<a href="/blog/first-post">Read more</a>')
  expect(exists('dist/category/first/3/index.html')).toBeFalsy()
  expect(exists('dist/blog/3/index.html')).toBeFalsy()

  // templates
  const firstPost = content('dist/blog/first-post/index.html')
  const secondPost = content('dist/blog/second-post/index.html')
  const thirdPost = content('dist/blog/third-post/index.html')
  expect(firstPost).toMatch('<h1>First post</h1>')
  expect(firstPost).toMatch('<span>2017</span>')
  expect(secondPost).toMatch('<h1>Second post</h1>')
  expect(secondPost).toMatch('<span>2018-03</span>')
  expect(thirdPost).toMatch('<h1>Third post</h1>')
  expect(thirdPost).toMatch('<span>2018-11-12</span>')

  // belongsTo with pagination
  const firstTagHTML = content('dist/tag/first-tag/index.html')
  const secondTagHTML = content('dist/tag/second-tag/index.html')
  const thirdTagHTML = content('dist/tag/third-tag/index.html')
  const fourthTagHTML = content('dist/tag/fourth-tag/index.html')
  const fourthTag2HTML = content('dist/tag/fourth-tag/2/index.html')
  const categoryFirstHTML = content('dist/category/first/index.html')
  const categoryFirst2HTML = content('dist/category/first/2/index.html')
  expect(firstTagHTML).toMatch('Third post')
  expect(firstTagHTML).toMatch('Second post')
  expect(secondTagHTML).toMatch('Second post')
  expect(secondTagHTML).toMatch('First post')
  expect(thirdTagHTML).toMatch('First post')
  expect(thirdTagHTML).toMatch('Third post')
  expect(fourthTagHTML).toMatch('Third post')
  expect(fourthTagHTML).toMatch('Second post')
  expect(fourthTagHTML).toMatch('Current page. Page 1')
  expect(fourthTag2HTML).toMatch('First post')
  expect(fourthTag2HTML).toMatch('Current page. Page 2')
  expect(categoryFirstHTML).toMatch('Third post')
  expect(categoryFirstHTML).toMatch('Second post')
  expect(categoryFirstHTML).toMatch('Current page. Page 1')
  expect(categoryFirst2HTML).toMatch('First post')
  expect(categoryFirst2HTML).toMatch('Current page. Page 2')

  await clear(context)
}, 15000)

test('build project with pathPrefix', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-path-prefix')
  const { config } = await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))

  expect(config.siteName).toEqual('Gridsome')

  const indexHTML = content('dist/index.html')
  const appJS = content('dist/assets/js/app.js')

  expect(indexHTML).toMatch('<h1>Gridsome</h1>')
  expect(indexHTML).toMatch('data-key="description" name="description" content="My super site"')
  expect(indexHTML).toMatch('href="/sub/-/dir/about"')
  expect(indexHTML).toMatch('href="/sub/-/dir/"')
  expect(indexHTML).toMatch('href="/sub/-/dir/assets/static/favicon.1539b60.test.png"')
  expect(indexHTML).toMatch('src="/sub/-/dir/assets/static/test.97c148e.test.png"')
  expect(indexHTML).toMatch('href="/sub/-/dir/assets/files/dummy.pdf"')
  expect(indexHTML).toMatch('src="/sub/-/dir/assets/js/app.js"')

  // __webpack_public_path__
  expect(appJS).toMatch('__webpack_require__.p = "/sub/-/dir/"')
  // stripPathPrefix helper
  expect(appJS).toMatch('publicPath = "/sub/-/dir/"')
  // router base
  expect(appJS).toMatch('base: "/sub/-/dir/"')

  // assets
  expect(exists('dist/assets/files/dummy.pdf')).toEqual(true)
  expect(exists('dist/assets/static/favicon.1539b60.test.png')).toEqual(true)
  expect(exists('dist/assets/static/test.97c148e.test.png')).toEqual(true)

  // 404.html
  expect(exists('dist/404.html')).toBeTruthy()
  expect(content('dist/404.html')).toMatch('404 - not found')

  await clear(context)
}, 5000)

async function clear (context) {
  await fs.remove(path.join(context, 'dist'))
  await fs.remove(path.join(context, 'src', '.temp'))
  await fs.remove(path.join(context, '.cache'))
}
