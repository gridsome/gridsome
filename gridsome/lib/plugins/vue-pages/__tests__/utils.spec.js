const { createPagePath: file } = require('../lib/utils')

test('transform static index file paths', () => {
  expect(file('/Index.vue')).toEqual('/')
  expect(file('/index.vue')).toEqual('/')
  expect(file('/section/Index.vue')).toEqual('/section')
})

test('transform static file paths', () => {
  expect(file('/Features.vue')).toEqual('/features')
  expect(file('/AboutUs.vue')).toEqual('/about-us')
  expect(file('/about-us.vue')).toEqual('/about-us')
  expect(file('/section/FooBar.vue')).toEqual('/section/foo-bar')
  expect(file('/section/BarIndex.vue')).toEqual('/section/bar-index')
  expect(file('/section/index/Foo.vue')).toEqual('/section/index/foo')
})

test('normalize paths', () => {
  expect(file('/section//FooBar.vue')).toEqual('/section/foo-bar')
  expect(file('section//Index.vue')).toEqual('/section')
})

test('transform dynamic file paths', () => {
  expect(file('/[id].vue')).toEqual('/:id')
  expect(file('/user/[id].vue')).toEqual('/user/:id')
  expect(file('/user/[id]/Profile.vue')).toEqual('/user/:id/profile')
  expect(file('/user/[id]/ProfileSettings/[sectionId].vue')).toEqual('/user/:id/profile-settings/:sectionId')

  // TODO: test these
  expect(file('/user/profile-[id].vue')).toEqual('/user/profile-:id')
  expect(file('/user/foo-[id]-bar.vue')).toEqual('/user/foo-:id-bar')
  expect(file('/user/[id]-bar.vue')).toEqual('/user/:id-bar')
})
