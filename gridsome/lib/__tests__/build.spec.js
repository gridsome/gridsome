const path = require('path')
const fs = require('fs-extra')
const build = require('../build')
const cheerio = require('cheerio')
const { uniq } = require('lodash')

test('build basic project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-basic')
  const { config } = await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))
  const load = file => cheerio.load(content(file))

  expect(config.siteName).toEqual('Gridsome')

  const indexHTML = content('dist/index.html')
  const $home = cheerio.load(indexHTML)

  // #163 - no duplicate style links
  expect(indexHTML.match(/styles\.css/g)).toHaveLength(2)

  // no objects should be rendered
  expect(indexHTML).not.toMatch('[object Object]')

  expect($home('head > title').text()).toEqual('Gridsome | Test')
  expect($home('#app').data('server-rendered')).toEqual(true)
  expect($home('meta[name="keywords"]').attr('content')).toEqual('test')
  expect($home('meta[name="og:title"]').attr('content')).toEqual('bar')
  expect($home('meta[name="test"]').attr('content')).toEqual('test-meta')
  expect($home('meta[name="og:description"]').attr('content')).toEqual('Test Value')
  expect($home('meta[name="description"]').attr('content')).toEqual('Index description')
  expect($home('h2.meta-data').text()).toEqual('Test Value')
  expect($home('span.from-custom-root-field').text()).toEqual('string from custom schema')
  expect($home('span.from-env-production').text()).toEqual('PROD_2')
  expect($home('span.from-plugin').text()).toEqual('test 2')
  expect($home('span.from-chain-webpack').text()).toEqual('test 3')
  expect($home('.footer span.meta-data-1').text()).toEqual('Test Value')
  expect($home('.footer span.meta-data-2').text()).toEqual('bar')

  // g-link

  expect($home('a.g-link-2.test-active.active--exact').attr('href')).toEqual('/')

  expect($home('a[href="http://outsidelink1.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="http://outsidelink1.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="https://outsidelink2.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="https://outsidelink2.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="//outsidelink3.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="//outsidelink3.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="https://www.gridsome.org/docs"]').attr('target')).toBeUndefined()
  expect($home('a[href="https://www.gridsome.org/docs"]').attr('rel')).toBeUndefined()

  // g-link (file)

  expect($home('a.g-link-file').attr('href')).toEqual('/assets/files/dummy.pdf')
  expect(exists('dist/assets/files/dummy.pdf')).toBeTruthy()

  // Custom src/index.html template

  expect($home('div.custom-html-template').text().trim()).toEqual('custom html template')

  // template with static routes

  const $page1 = load('dist/pages/1/index.html')
  const $page2 = load('dist/pages/2/index.html')
  expect($page1('h1').text()).toEqual('Page 1')
  expect($page1('h2').text()).toEqual('Doc 4')
  expect($page2('h1').text()).toEqual('Page 2')
  expect($page2('h2').text()).toEqual('Doc 3')

  // template with static routes and pagination

  expect(load('dist/docs/1/index.html')('h1').text()).toEqual('Doc 1')
  expect(load('dist/docs/2/index.html')('h1').text()).toEqual('Doc 2')
  expect(load('dist/docs/2/2/index.html')('h1').text()).toEqual('Doc 2')
  expect(load('dist/docs/2/3/index.html')('h1').text()).toEqual('Doc 2')
  expect(exists('dist/docs/1/2/index.html')).toBeFalsy()
  expect(exists('dist/docs/2/4/index.html')).toBeFalsy()
  expect(exists('dist/docs/3/2/index.html')).toBeFalsy()

  // 404.html

  const $404 = load('dist/404.html')

  expect($404('h1').text()).toEqual('Custom 404 - not found')
  expect($404('span.page-query-value').text().trim()).toEqual('string from custom schema')

  // scripts

  const appJS = content('dist/assets/js/app.js')
  const homeJS = content('dist/assets/js/component--home.js')

  // never include the context path
  expect(appJS).not.toMatch(context)
  expect(homeJS).not.toMatch(context)

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

  expect($home('img.g-image-1').attr('src')).toMatch('data:image/svg+xml')
  expect($home('img.g-image-1').attr('alt')).toMatch('SVG logo')
  expect($home('img.g-image-2').attr('alt')).toMatch('Test image')
  expect($home('img.g-image-2').data('srcset')).toMatch('/assets/static/test.82a2fbd.test.png 480w')
  expect($home('img.g-image-2').data('src')).toEqual('/assets/static/test.97c148e.test.png')
  expect($home('img.g-image-2').attr('class')).not.toEqual('g-image-false')
  expect($home('img.g-image-static').attr('src')).toEqual('/uploads/test.png')
  expect($home('img.g-image-static').attr('alt')).toEqual('Static image')
  expect($home('img.g-image-immediate').attr('src')).toEqual('/assets/static/test.cbab2cf.test.png')
  expect($home('img.g-image-immediate').attr('alt')).toEqual('Immediate image')
  expect($home('img.g-image-external').attr('src')).toEqual('https://www.example.com/assets/image.png')
  expect($home('img.g-image-external').attr('alt')).toEqual('External image')
  expect($home('img[width=""]').get().length).toEqual(0)

  // no duplicate classes
  const classes = $home('img.g-image-1').attr('class').split(' ')
  expect(uniq(classes).length - classes.length).toEqual(0)

  await clear(context)
}, 15000)

test('build project with pathPrefix', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-path-prefix')
  const { config } = await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))
  const load = file => cheerio.load(content(file))

  expect(config.siteName).toEqual('Gridsome')

  const $home = load('dist/index.html')

  expect($home('h1').text()).toEqual('Gridsome')
  expect($home('meta[data-key="description"]').attr('content')).toEqual('My super site')
  expect($home('.g-link-about').attr('href')).toEqual('/sub/-/dir/about')
  expect($home('.g-link-home').attr('href')).toEqual('/sub/-/dir/')
  expect($home('.g-image-test').data('src')).toEqual('/sub/-/dir/assets/static/test.97c148e.test.png')
  expect($home('.g-link-file').attr('href')).toEqual('/sub/-/dir/assets/files/dummy.pdf')
  expect($home('script[src="/sub/-/dir/assets/js/app.js"]').get().length).toEqual(1)

  // scripts

  const appJS = content('dist/assets/js/app.js')

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

  await clear(context)
}, 5000)

test('build blog project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-blog')

  await build(context)

  const content = file => fs.readFileSync(path.join(context, file), 'utf8')
  const exists = file => fs.existsSync(path.join(context, file))
  const load = file => cheerio.load(content(file))

  const $404 = load('dist/404.html')

  expect($404('h1').text()).toEqual('404 - not found')

  const $blog = load('dist/index.html')
  const $blog2 = load('dist/2/index.html')

  // pagination
  expect($blog('.current-page').text()).toEqual('1')
  expect($blog2('.current-page').text()).toEqual('2')
  expect($blog('nav[role="navigation"] a').get().length).toEqual(3)
  expect($blog('a.active--exact.active').attr('href')).toEqual('/')
  expect($blog('a.active--exact.active').attr('aria-current')).toEqual('true')

  expect($blog('.post-3 span').text()).toEqual('Third post')
  expect($blog('.post-3 a').attr('href')).toEqual('/third-post')
  expect($blog('.post-2 span').text()).toEqual('Second post')
  expect($blog('.post-2 a').attr('href')).toEqual('/second-post')
  expect($blog2('.post-1 span').text()).toEqual('First post')
  expect($blog2('.post-1 a').attr('href')).toEqual('/first-post')

  expect(exists('dist/category/first/3/index.html')).toBeFalsy()
  expect(exists('dist/3/index.html')).toBeFalsy()

  // templates

  const $post1 = load('dist/first-post/index.html')
  const $post2 = load('dist/second-post/index.html')
  const $post3 = load('dist/third-post/index.html')

  expect($post1('.post-title').text()).toEqual('First post')
  expect($post1('.post-date').text()).toEqual('2017')
  expect($post2('.post-title').text()).toEqual('Second post')
  expect($post2('.post-date').text()).toEqual('2018-03')
  expect($post3('.post-title').text()).toEqual('Third post')
  expect($post3('.post-date').text()).toEqual('2018-11-12')

  // belongsTo with pagination

  const $tag1 = load('dist/tag/first-tag/index.html')
  const $tag2 = load('dist/tag/second-tag/index.html')
  const $tag3 = load('dist/tag/third-tag/index.html')
  const $tag4 = load('dist/tag/fourth-tag/index.html')
  const $tag4page2 = load('dist/tag/fourth-tag/2/index.html')
  const $category1 = load('dist/category/first/index.html')
  const $category1page2 = load('dist/category/first/2/index.html')

  expect($tag1('.post-3 span').text()).toEqual('Third post')
  expect($tag1('.post-2 span').text()).toEqual('Second post')
  expect($tag2('.post-2 span').text()).toEqual('Second post')
  expect($tag2('.post-1 span').text()).toEqual('First post')
  expect($tag3('.post-1 span').text()).toEqual('First post')
  expect($tag3('.post-3 span').text()).toEqual('Third post')
  expect($tag4('.post-3 span').text()).toEqual('Third post')
  expect($tag4('.post-2 span').text()).toEqual('Second post')
  expect($tag4('a[href="/tag/fourth-tag"]').attr('aria-label')).toEqual('Current page. Page 1')
  expect($tag4page2('.post-1 span').text()).toEqual('First post')
  expect($tag4page2('a[href="/tag/fourth-tag/2"]').attr('aria-label')).toEqual('Current page. Page 2')
  expect($category1('.post-3 span').text()).toEqual('Third post')
  expect($category1('.post-2 span').text()).toEqual('Second post')
  expect($category1('a[href="/category/first"]').attr('aria-label')).toEqual('Current page. Page 1')
  expect($category1page2('.post-1 span').text()).toEqual('First post')
  expect($category1page2('a[href="/category/first/2"]').attr('aria-label')).toEqual('Current page. Page 2')

  await clear(context)
}, 10000)

async function clear (context) {
  await fs.remove(path.join(context, 'dist'))
  await fs.remove(path.join(context, 'src', '.temp'))
  await fs.remove(path.join(context, '.cache'))
}
