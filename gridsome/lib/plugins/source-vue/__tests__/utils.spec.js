const path = require('path')
const { createPagePath, parseComponent } = require('../lib/utils')

test('transform filepath into router path', () => {
  const home = createPagePath('Index.vue')
  const lowercase = createPagePath('index.vue')
  const features = createPagePath('Features.vue')
  const aboutUs = createPagePath('AboutUs.vue')
  const aboutUs2 = createPagePath('about-us.vue')
  const nested = createPagePath('section/Index.vue')
  const nested2 = createPagePath('section/FooBar.vue')
  const nested3 = createPagePath('section/BarIndex.vue')

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
