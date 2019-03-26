const path = require('path')
const App = require('../../app/App')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('create page', async () => {
  const { pages, pages: { createPage }} = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')

  const page = createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(page.path).toEqual('/page')
  expect(page.route).toEqual('/page')
  expect(page.chunkName).toBeUndefined()
  expect(page.context).toBeNull()
  expect(page.query.document).toBeNull()
  expect(page.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
  expect(emit).toHaveBeenCalledTimes(1)

  emit.mockRestore()
})

test('create page with pagination', async () => {
  const { pages: { createPage }} = await createApp()

  const page = createPage({
    path: '/page',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(page.path).toEqual('/page')
  expect(page.route).toEqual('/page/:page(\\d+)?')
  expect(page.query.paginate.typeName).toEqual('Post')
})

test('create page with custom route', async () => {
  const { pages: { createPage }} = await createApp()

  const page = createPage({
    path: '/page/1',
    route: '/page/:id',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(page.path).toEqual('/page/1')
  expect(page.route).toEqual('/page/:id/:page(\\d+)?')
  expect(page.internal.route).toEqual('/page/:id')
  expect(page.internal.isDynamic).toEqual(true)
})

test('upate page', async () => {
  const { pages, pages: { createPage, updatePage }} = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')

  const page1 = createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(page1.path).toEqual('/page')
  expect(page1.route).toEqual('/page')
  expect(page1.chunkName).toBeUndefined()
  expect(page1.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))

  const page2 = updatePage({
    path: '/page',
    chunkName: 'page',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(page2.path).toEqual('/page')
  expect(page2.route).toEqual('/page/:page(\\d+)?')
  expect(page2.chunkName).toEqual('page')
  expect(page2.component).toEqual(path.join(__dirname, '__fixtures__', 'PagedPage.vue'))
  expect(pages.allPages()).toHaveLength(2) // includes /404
  expect(emit).toHaveBeenCalledTimes(2)

  emit.mockRestore()
})

test('override page with equal path', async () => {
  const { pages, pages: { createPage }} = await createApp()

  createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  createPage({
    path: '/page',
    chunkName: 'page',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(pages.allPages()).toHaveLength(2) // includes /404
})

test('allways include a /404 page', async () => {
  const app = await createApp()
  const notFound = app.pages.findPage({ path: '/404' })

  expect(notFound.path).toEqual('/404')
})

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
