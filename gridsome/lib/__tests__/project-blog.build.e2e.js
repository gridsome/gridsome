const path = require('path')
const fs = require('fs-extra')
const build = require('../build')
const cheerio = require('cheerio')
const express = require('express')
const puppeteer = require('puppeteer')

const context = path.join(__dirname, '__fixtures__', 'project-blog')
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

test('render pagination', () => {
  const $blog = load('dist/index.html')
  const $blog2 = load('dist/2/index.html')

  expect($blog('.current-page').text()).toEqual('1')
  expect($blog2('.current-page').text()).toEqual('2')
  expect($blog('nav[role="navigation"] a').get().length).toEqual(3)
  expect($blog('a.active--exact.active').attr('href')).toEqual('/')
  expect($blog('a.active--exact.active').attr('aria-current')).toEqual('true')

  expect($blog('.post-4 span').text()).toEqual('Fourth post')
  expect($blog('.post-4 a').attr('href')).toEqual('/fourth-post/')
  expect($blog('.post-3 span').text()).toEqual('Third post')
  expect($blog('.post-3 a').attr('href')).toEqual('/third-post/')
  expect($blog2('.post-2 span').text()).toEqual('Second post')
  expect($blog2('.post-2 a').attr('href')).toEqual('/second-post/')
  expect($blog2('.post-1 span').text()).toEqual('First post')
  expect($blog2('.post-1 a').attr('href')).toEqual('/first-post/')

  expect(exists('dist/category/first/3/index.html')).toBeFalsy()
  expect(exists('dist/3/index.html')).toBeFalsy()
})

test('render templates', () => {
  const $post1 = load('dist/first-post/index.html')
  const $post2 = load('dist/second-post/index.html')
  const $post3 = load('dist/third-post/index.html')

  expect($post1('.post-title').text()).toEqual('First post')
  expect($post1('.post-date').text()).toEqual('2017')
  expect($post2('.post-title').text()).toEqual('Second post')
  expect($post2('.post-date').text()).toEqual('2018-03')
  expect($post3('.post-title').text()).toEqual('Third post')
  expect($post3('.post-date').text()).toEqual('2018-11-12')
})

test('render belongsTo with pagination', () => {
  const $tag1 = load('dist/tag/first-tag/index.html')
  const $tag2 = load('dist/tag/second-tag/index.html')
  const $tag3 = load('dist/tag/third-tag/index.html')
  const $tag4 = load('dist/tag/fourth-tag/index.html')
  const $tag4page2 = load('dist/tag/fourth-tag/2/index.html')
  const $category1 = load('dist/category/first/index.html')
  const $category1page2 = load('dist/category/first/2/index.html')

  expect($tag1('.post-3 a').text()).toEqual('Third post')
  expect($tag1('.post-2 a').text()).toEqual('Second post')
  expect($tag2('.post-2 a').text()).toEqual('Second post')
  expect($tag2('.post-1 a').text()).toEqual('First post')
  expect($tag3('.post-1 a').text()).toEqual('First post')
  expect($tag3('.post-3 a').text()).toEqual('Third post')
  expect($tag4('.post-3 a').text()).toEqual('Third post')
  expect($tag4('.post-2 a').text()).toEqual('Second post')
  expect($tag4('nav[role="navigation"] a[href="/tag/fourth-tag/"]').attr('aria-label')).toEqual('Current page. Page 1')
  expect($tag4page2('.post-1 a').text()).toEqual('First post')
  expect($tag4page2('nav[role="navigation"] a[href="/tag/fourth-tag/2/"]').attr('aria-label')).toEqual('Current page. Page 2')
  expect($category1('.post-3 a').text()).toEqual('Third post')
  expect($category1('.post-2 a').text()).toEqual('Second post')
  expect($category1('nav[role="navigation"] a[href="/category/first/"]').attr('aria-label')).toEqual('Current page. Page 1')
  expect($category1page2('.post-1 a').text()).toEqual('First post')
  expect($category1page2('nav[role="navigation"] a[href="/category/first/2/"]').attr('aria-label')).toEqual('Current page. Page 2')
})

test('open blog in browser', async () => {
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('navigate to /2', async () => {
  await page.click('nav[role="navigation"] .pager-link.active + .pager-link')
  await page.waitForSelector('#app.home-2')
})

test('navigate to /first-post', async () => {
  await page.click('.post-link-1')
  await page.waitForSelector('#app.post-1')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home-1')
})

test('navigate to /third-post', async () => {
  await page.click('.post-link-3')
  await page.waitForSelector('#app.post-3')
})

test('navigate to /tag/fourth-tag', async () => {
  await page.click('.tag-link-4')
  await page.waitForSelector('#app.tag-4')
})

test('navigate to /tag/fourth-tag/2', async () => {
  await page.click('nav[role="navigation"] a.active + a')
  await page.waitForSelector('#app.tag-4.tag-page-2')
})

test('navigate to /tag/4/extra', async () => {
  await page.click('.tag-extra-link')
  await page.waitForSelector('#app.tag-4.tag-page-1')
})

test('navigate to /tag/4/extra/2', async () => {
  await page.click('nav[role="navigation"] a.active + a')
  await page.waitForSelector('#app.tag-4.tag-page-2')
})

test('navigate to /first-post', async () => {
  await page.click('.post-link-1')
  await page.waitForSelector('#app.post-1')
})

test('navigate to /category/first', async () => {
  await page.click('.category-link-1')
  await page.waitForSelector('#app.category-1')
})

test('navigate to /category/first/2', async () => {
  await page.click('nav[role="navigation"] a.active + a')
  await page.waitForSelector('#app.category-1.category-page-2')
})

test('navigate to /first-post', async () => {
  await page.click('.post-link-1')
  await page.waitForSelector('#app.post-1')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home-1')
})

test('navigate to /asdf', async () => {
  await page.click('.not-found-link')
  await page.waitForSelector('#app.not-found')
})

test('navigate to /', async () => {
  await page.click('.home-link')
  await page.waitForSelector('#app.home-1')
})

test('open /2/ directly', async () => {
  await page.goto('http://localhost:8080/2/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('open /category/first/ directly', async () => {
  await page.goto('http://localhost:8080/category/first/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})

test('open /first-post/ directly', async () => {
  await page.goto('http://localhost:8080/first-post/', { waitUntil: 'networkidle2' })
  await page.waitForSelector('#app.is-mounted')
})
