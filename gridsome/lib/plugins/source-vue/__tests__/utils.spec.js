const path = require('path')
const { createPagePath, parseComponent } = require('../lib/utils')

test('transform filepath into router path', () => {
  const home = createPagePath('src/pages/Index.vue')
  const lowercase = createPagePath('src/pages/index.vue')
  const features = createPagePath('src/pages/Features.vue')
  const aboutUs = createPagePath('src/pages/AboutUs.vue')
  const aboutUs2 = createPagePath('src/pages/about-us.vue')
  const nested = createPagePath('src/pages/section/Index.vue')
  const nested2 = createPagePath('src/pages/section/FooBar.vue')
  const nested3 = createPagePath('src/pages/section/BarIndex.vue')

  expect(home).toEqual('/')
  expect(lowercase).toEqual('/')
  expect(features).toEqual('/features')
  expect(aboutUs).toEqual('/about-us')
  expect(aboutUs2).toEqual('/about-us')
  expect(nested).toEqual('/section')
  expect(nested2).toEqual('/section/foo-bar')
  expect(nested3).toEqual('/section/bar-index')
})

test('extract page query from component', () => {
  const filePath = path.resolve(__dirname, '__fixtures__/ComponentWithQuery.vue')
  const { pageQuery } = parseComponent(filePath)

  expect(pageQuery.trim()).toMatchSnapshot()
})

test('extract empty page query if missing', () => {
  const filePath = path.resolve(__dirname, '__fixtures__/ComponentWithoutQuery.vue')
  const { pageQuery } = parseComponent(filePath)

  expect(pageQuery).toBeNull()
})
