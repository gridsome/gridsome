const path = require('path')
const fs = require('fs-extra')
const build = require('../build')
const cheerio = require('cheerio')
const express = require('express')
const puppeteer = require('puppeteer')

const context = path.join(__dirname, '__fixtures__', 'project-path-prefix')
const content = file => fs.readFileSync(path.join(context, file), 'utf8')
const exists = file => fs.existsSync(path.join(context, file))
const load = file => cheerio.load(content(file))
const app = express()

let browser, page, server, publicPath

beforeAll(async () => {
  const { config } = await build(context, { cache: false })

  publicPath = config.publicPath

  await fs.remove(path.join(context, 'public'))
  await fs.copy(path.join(context, 'dist'), path.join(context, 'public', publicPath))

  app.use(express.static(path.join(context, 'public')))

  browser = await puppeteer.launch({ headless: false })
  page = await browser.newPage()
  server = app.listen(8080)
}, 20000)

afterAll(async () => {
  server && await server.close()
  browser && await browser.close()
  await fs.remove(path.join(context, 'dist'))
  await fs.remove(path.join(context, 'public'))
  await fs.remove(path.join(context, 'src', '.temp'))
  await fs.remove(path.join(context, 'node_modules', '.cache'))
  await fs.remove(path.join(context, '.cache'))
})

test('include pathPrefix in asset URLs', () => {
  const $home = load('dist/index.html')

  expect($home('.g-link-about').attr('href')).toEqual('/sub/-/dir/about')
  expect($home('.g-link-home').attr('href')).toEqual('/sub/-/dir/')
  expect($home('.g-image-test').data('src')).toEqual('/sub/-/dir/assets/static/test.97c148e.test.png')
  expect($home('.g-link-file').attr('href')).toEqual('/sub/-/dir/assets/files/dummy.test.pdf')
  expect($home('script[src="/sub/-/dir/app.js"]').get().length).toEqual(1)
})

test('include pathPrefix in scripts', () => {
  const appJS = content('dist/app.js')
  const runtimeJS = content('dist/runtime.js')

  // __webpack_public_path__
  expect(runtimeJS).toMatch('__webpack_require__.p = "/sub/-/dir/"')
  // stripPathPrefix(path) helper
  expect(appJS).toMatch('"pathPrefix": "/sub/-/dir"')
  // router base
  expect(appJS).toMatch('base: "/sub/-/dir/"')
})

test('put assets in correct folder', () => {
  expect(exists('dist/assets/files/dummy.test.pdf')).toEqual(true)
  expect(exists('dist/assets/static/favicon.1539b60.test.png')).toEqual(true)
  expect(exists('dist/assets/static/test.97c148e.test.png')).toEqual(true)
})

test('open homepage in browser', async () => {
  await page.goto(`http://localhost:8080${publicPath}`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('navigate to /about', async () => {
  await page.click('.g-link-about')
  await page.waitForSelector('#app.about')
})

test('navigate to /', async () => {
  await page.click('.g-link-home')
  await page.waitForSelector('#app.home')
})

test('navigate to /missing', async () => {
  await page.click('.g-link-missing')
  await page.waitForSelector('#app.not-found')
})

test('open /about/ directly', async () => {
  await page.goto(`http://localhost:8080${publicPath}about/`, { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

