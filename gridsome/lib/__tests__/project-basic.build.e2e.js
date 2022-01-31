const path = require('path')
const fs = require('fs-extra')
const build = require('../build')
const cheerio = require('cheerio')
const express = require('express')
const puppeteer = require('puppeteer')
const { trim, uniq } = require('lodash')

const context = path.join(__dirname, '__fixtures__', 'project-basic')
const content = file => fs.readFileSync(path.join(context, file), 'utf8')
const exists = file => fs.existsSync(path.join(context, file))
const load = file => cheerio.load(content(file))
const app = express()

let browser, page, server

beforeAll(async () => {
  await build(context, { cache: false })

  app.use(express.static(path.join(context, 'dist')))

  browser = await puppeteer.launch({ headless: false })
  page = await browser.newPage()
  server = app.listen(8080)
}, 20000)

afterAll(async () => {
  server && await server.close()
  browser && await browser.close()
  await fs.remove(path.join(context, 'dist'))
  await fs.remove(path.join(context, 'src', '.temp'))
  await fs.remove(path.join(context, 'node_modules', '.cache'))
  await fs.remove(path.join(context, '.cache'))
})

test('build basic project', () => {
  const indexHTML = content('dist/index.html')
  const $home = cheerio.load(indexHTML)

  // no objects should be rendered
  expect(indexHTML).not.toMatch('[object Object]')

  expect($home('#app').data('server-rendered')).toEqual(true)
  expect($home('meta[name="keywords"]').attr('content')).toEqual('test')
  expect($home('meta[name="og:title"]').attr('content')).toEqual('bar')
  expect($home('meta[name="test"]').attr('content')).toEqual('test-meta')
  expect($home('meta[name="og:description"]').attr('content')).toEqual('Test Value')
  expect($home('meta[name="description"]').attr('content')).toEqual('Index description')
  expect($home('meta[name="description"]').get()).toHaveLength(1)
  expect($home('h2.meta-data').text()).toEqual('Test Value')
  expect($home('span.from-custom-root-field').text()).toEqual('string from custom schema')
  expect($home('span.from-env-production').text()).toEqual('PROD_2')
  expect($home('span.from-plugin').text()).toEqual('test 2')
  expect($home('span.from-chain-webpack').text()).toEqual('test 3')
  expect($home('span.from-metadata').text()).toEqual('test')
  expect($home('.footer span.meta-data-1').text()).toEqual('Test Value')
  expect($home('.footer span.meta-data-2').text()).toEqual('bar')
})

test('set title in custom App.vue', () => {
  const $home = load('dist/index.html')
  expect($home('head > title').text()).toEqual('Gridsome [basic] | Test')
})

test('render custom html template', () => {
  const $home = load('dist/index.html')
  expect($home('div.custom-html-template').text().trim()).toEqual('custom html template')
})

test('render favicons', () => {
  expect(exists('dist/assets/static/favicon.1539b60.test.png')).toBeTruthy()
})

test('copy contents of static folder', () => {
  expect(exists('dist/external/index.html')).toBeTruthy()
})

// #163 - no duplicate style links
test('do not render duplicate style links', () => {
  expect(content('dist/index.html').match(/styles\.css/g)).toHaveLength(2)
})

test('render g-link components', () => {
  const $home = load('dist/index.html')

  expect($home('a.g-link-1.is-active.active--exact').attr('href')).toEqual('/')
  expect($home('a.g-link-2.test-active.active--exact').attr('href')).toEqual('/')

  expect($home('a[href="http://outsidelink1.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="http://outsidelink1.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="https://outsidelink2.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="https://outsidelink2.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="//outsidelink3.com"]').attr('target')).toEqual('_blank')
  expect($home('a[href="//outsidelink3.com"]').attr('rel')).toEqual('noopener')

  expect($home('a[href="https://www.gridsome.org/docs"]').attr('target')).toBeUndefined()
  expect($home('a[href="https://www.gridsome.org/docs"]').attr('rel')).toBeUndefined()

  expect($home('a.g-link-file').attr('href')).toEqual('/assets/files/dummy.test.pdf')
  expect(exists('dist/assets/files/dummy.test.pdf')).toBeTruthy()
})

test('render g-image components', () => {
  const $home = load('dist/index.html')
  const $about = load('dist/about/index.html')
  const aboutJS = content('dist/page--src--pages--about-vue.js')

  // #1318 - Exclude `dataUri` from bundle when not lazy loading the image.
  expect(aboutJS).not.toMatch('"dataUri":"data:image/svg')
  expect($about('img.g-image').attr('src')).not.toMatch('data:image/svg')

  expect(exists('dist/assets/static/test.82a2fbd.test.png')).toBeTruthy()
  expect(exists('dist/assets/static/test.97c148e.test.png')).toBeTruthy()

  expect($home('img.g-image-1').attr('src')).toMatch('data:image/svg')
  expect($home('img.g-image-1').attr('alt')).toMatch('SVG logo')
  expect($home('img.g-image-2').attr('alt')).toMatch('Test image')
  expect($home('img.g-image-2').data('srcset')).toMatch('/assets/static/test.82a2fbd.test.png 480w')
  expect($home('img.g-image-2').data('src')).toEqual('/assets/static/test.97c148e.test.png')
  expect($home('img.g-image-2').attr('class')).not.toEqual('g-image-false')
  expect($home('img.g-image-2 + noscript').html()).toMatch('alt="Test image"')
  expect($home('img.g-image-static').attr('src')).toEqual('/uploads/test.png')
  expect($home('img.g-image-static').attr('alt')).toEqual('Static image')
  expect($home('img.g-image-immediate').attr('src')).toEqual('/assets/static/test.f64918e.test.png')
  expect($home('img.g-image-immediate').attr('alt')).toEqual('Immediate image')
  expect($home('img.g-image-external').attr('src')).toEqual('https://www.example.com/assets/image.png')
  expect($home('img.g-image-external').attr('alt')).toEqual('External image')
  expect($home('img[width=""]').get().length).toEqual(0)

  // no duplicate classes
  const classes = $home('img.g-image-1').attr('class').split(' ')
  expect(uniq(classes).length - classes.length).toEqual(0)
})

test('render custom route meta', () => {
  const appJS = content('dist/app.js')

  expect(appJS).toMatch('aboutUsMeta1: true')
  expect(appJS).toMatch('$aboutUsMeta2: [1, 2, 3]')
})

test('render template with static routes', () => {
  const $page1 = load('dist/pages/1/index.html')
  const $page2 = load('dist/pages/2/index.html')

  expect($page1('h1').text()).toEqual('Page 1')
  expect($page1('h2').text()).toEqual('Doc 4')
  expect($page2('h1').text()).toEqual('Page 2')
  expect($page2('h2').text()).toEqual('Doc 3')
})

test('render template with static routes and pagination', () => {
  expect(load('dist/docs/1/index.html')('h1').text()).toEqual('Doc 1')
  expect(load('dist/docs/2/index.html')('h1').text()).toEqual('Doc 2')
  expect(load('dist/docs/2/2/index.html')('h1').text()).toEqual('Doc 2')
  expect(load('dist/docs/2/3/index.html')('h1').text()).toEqual('Doc 2')
  expect(exists('dist/docs/1/2/index.html')).toBeFalsy()
  expect(exists('dist/docs/2/4/index.html')).toBeFalsy()
  expect(exists('dist/docs/3/2/index.html')).toBeFalsy()
})

test('render page $context', () => {
  const $page1 = load('dist/about/index.html')
  const $page2 = load('dist/about-us/index.html')

  expect($page1('h1').text()).toEqual('')
  expect($page2('h1').text()).toEqual('About us')
})

test('generate /404.html', () => {
  const $404 = load('dist/404.html')

  expect($404('h1').text()).toEqual('Custom 404 - not found')
  expect($404('span.page-query-value').text().trim()).toEqual('string from custom schema')
})

test('compile scripts correctly', () => {
  const appJS = content('dist/app.js')
  const vendorsJS = content('dist/vendors.js')
  const homeJS = content('dist/page--src--pages--index-vue.js')

  // never include the context path
  expect(appJS).not.toMatch(context)
  expect(homeJS).not.toMatch(context)

  // api.transpileDependencies
  expect(vendorsJS).not.toMatch('testToArray1 (...args)') // transpiled
  expect(vendorsJS).toMatch('testToArray2 (...args)') // not transpiled
  expect(vendorsJS).not.toMatch('classTestMethod ()') // transpiled

  // transpile custom sfc blocks
  expect(appJS).not.toMatch('Component =>') // static-query
  expect(homeJS).not.toMatch('Component =>') // page-query

  // env variables
  expect(homeJS).toMatch('GRIDSOME_PROD_VARIABLE: "PROD_1"')
  expect(homeJS).toMatch('process.env.SECRET_VALUE')
  expect(homeJS).not.toMatch('secret_value')
})

test('compile scripts includes polyfills', () => {
  const vendorsJS = content('dist/vendors.js')

  expect(vendorsJS).toMatch('core-js/modules/es.promise.js')
  expect(vendorsJS).toMatch('core-js/modules/es.string.ends-with.js')
})

test('compile a single css file', () => {
  const files = fs.readdirSync(path.join(context, 'dist/assets/css'))
  expect(files.length).toEqual(1)
})

test('remove the styles.js chunk', () => {
  const files = fs.readdirSync(path.join(context, 'dist'))
  const chunk = files.find(file => file === 'styles.js')
  expect(chunk).toBeUndefined()
})

test('open homepage in browser', async () => {
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('load .g-image', async () => {
  await page.waitForSelector('.g-image--loaded')
})

test('navigate to /docs/1', async () => {
  await page.click('.doc-link-1')
  await page.waitForSelector('#app.doc-template-1')
})

test('navigate to /docs/1/extra', async () => {
  await page.click('.doc-extra-link')
  await page.waitForSelector('#app.doc-extra-template-1')
  await page.click('.doc-link')
  await page.waitForSelector('#app.doc-template-1')
})

test('navigate to /pages/2', async () => {
  await page.click('.page-link-2')
  await page.waitForSelector('#app.page-template')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home')
})

test('fetch /doc/3 data', async () => {
  await page.click('.fetch-doc-page-3')
  await page.waitForSelector('.fetched-doc-page-3')
})

test('fetch /doc/6 data', async () => {
  await page.click('.fetch-doc-page-6')
  await page.waitForSelector('.fetched-doc-page-not-found')
})

test('navigate to /docs/2', async () => {
  await page.click('.doc-link-2')
  await page.waitForSelector('#app.doc-template-2.page-1')
})

test('navigate to /docs/2/2', async () => {
  await page.click('nav[role="navigation"] a.is-active + a')
  await page.waitForSelector('#app.doc-template-2.page-2')
})

test('navigate to /docs/2/3', async () => {
  await page.click('nav[role="navigation"] a.is-active + a')
  await page.waitForSelector('#app.doc-template-2.page-3')
})

test('navigate to /docs/2/extra', async () => {
  await page.click('.doc-extra-link')
  await page.waitForSelector('#app.doc-extra-template-2')
  await page.click('.doc-link')
  await page.waitForSelector('#app.doc-template-2')
})

test('navigate to /pages/1', async () => {
  await page.click('.page-link-1')
  await page.waitForSelector('#app.page-template')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home')
})

test('navigate to /custom-route/foo/bar', async () => {
  await page.click('.custom-route')
  await page.waitForSelector('#app.foo.bar')
  await page.waitForSelector('.custom-child-route')

  const title = await page.$eval('.custom-route-title', el => el.textContent)
  const heading = await page.$eval('.custom-child-route-heading', el => el.textContent)

  expect(trim(title)).toEqual('Gridsome')
  expect(trim(heading)).toEqual('Gridsome')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home')
})

test('navigate to /asdf', async () => {
  await page.click('.not-found-link')
  await page.waitForSelector('#app.not-found')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home')
})

test('navigate to /external', async () => {
  await page.click('.external-link')
  await page.waitForSelector('body.external')
})

test('open /docs/1/ directly', async () => {
  await page.goto('http://localhost:8080/docs/1/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('open /docs/1/extra/ directly', async () => {
  await page.goto('http://localhost:8080/docs/1/extra/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('open /pages/2/ directly', async () => {
  await page.goto('http://localhost:8080/pages/2/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})
