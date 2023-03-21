const slugify = require('@sindresorhus/slugify')
const { createPagePath: file } = require('../lib/utils')

test('transform static index file paths', () => {
  expect(file('/Index.vue', slugify)).toEqual('/')
  expect(file('/index.vue', slugify)).toEqual('/')
  expect(file('/section/Index.vue', slugify)).toEqual('/section')
  expect(file('/FooBar/Index.vue')).toEqual('/FooBar')
})

test('transform static file paths', () => {
  expect(file('/Features.vue', slugify)).toEqual('/features')
  expect(file('/AboutUs.vue', slugify)).toEqual('/about-us')
  expect(file('/about-us.vue', slugify)).toEqual('/about-us')
  expect(file('/section/FooBar.vue', slugify)).toEqual('/section/foo-bar')
  expect(file('/section/BarIndex.vue', slugify)).toEqual('/section/bar-index')
  expect(file('/section/index/Foo.vue', slugify)).toEqual('/section/index/foo')
})

test('normalize paths', () => {
  expect(file('/section//FooBar.vue', slugify)).toEqual('/section/foo-bar')
  expect(file('section//Index.vue', slugify)).toEqual('/section')
})

test('transform dynamic file paths', () => {
  expect(file('/[id].vue', slugify)).toEqual('/:id')
  expect(file('/user/[id].vue', slugify)).toEqual('/user/:id')
  expect(file('/user/[id]/Profile.vue', slugify)).toEqual('/user/:id/profile')
  expect(file('/user/[id]/ProfileSettings/[sectionId].vue', slugify)).toEqual('/user/:id/profile-settings/:sectionId')

  // TODO: test these
  expect(file('/user/profile-[id].vue', slugify)).toEqual('/user/profile-:id')
  expect(file('/user/foo-[id]-bar.vue', slugify)).toEqual('/user/foo-:id-bar')
  expect(file('/user/[id]-bar.vue', slugify)).toEqual('/user/:id-bar')
})
