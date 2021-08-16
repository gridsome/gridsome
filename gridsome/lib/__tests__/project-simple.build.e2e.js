const path = require('path')
const fs = require('fs-extra')
const build = require('../build')
const cheerio = require('cheerio')
const express = require('express')
const puppeteer = require('puppeteer')

const context = path.join(__dirname, '__fixtures__', 'project-simple')
const content = file => fs.readFileSync(path.join(context, file), 'utf8')
const exists = file => fs.existsSync(path.join(context, file))
const load = file => cheerio.load(content(file))
const app = express()

let browser, page, server

beforeAll(async () => {
  await build(context, { cache: false })

  app.use(express.static(path.join(context, 'dist')))

  browser = await puppeteer.launch()
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

test('build simple project', () => {
  const $home = load('dist/index.html')
  expect($home('h1').text()).toEqual('Index.vue')
})

test('don\'t render empty siteDescription ', () => {
  const $home = load('dist/index.html')
  expect($home('meta[data-key="description"]').length).toEqual(0)
})

test('data dir should be empty', () => {
  expect(exists('dist/assets/data/1')).toBeFalsy()
})

test('open homepage in browser', async () => {
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})
