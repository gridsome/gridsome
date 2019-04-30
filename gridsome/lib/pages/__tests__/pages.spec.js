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
  expect(page.context).toBeNull()
  expect(page.queryVariables).toBeNull()
  expect(page.query.document).toBeNull()
  expect(page.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
  expect(page.chunkName).toEqual('page--fixtures--default-page-vue')

  expect(emit).toHaveBeenCalledWith('create', page)
  expect(emit).toHaveBeenCalledTimes(1)
})

test('create page with plugin api', async () => {
  await createApp(function (api) {
    api.createPages(pages => {
      const emit = jest.spyOn(api._app.pages._events, 'emit')

      const page = pages.createPage({
        path: '/page',
        component: './__fixtures__/DefaultPage.vue'
      })

      expect(page.path).toEqual('/page')
      expect(page.route).toEqual('/page')
      expect(page.context).toBeNull()
      expect(page.queryVariables).toBeNull()
      expect(page.query.document).toBeNull()
      expect(page.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
      expect(page.chunkName).toEqual('page--fixtures--default-page-vue')
      expect(page.internal.isManaged).toEqual(false)

      expect(pages.graphql).toBeInstanceOf(Function)
      expect(pages.getContentType).toBeInstanceOf(Function)
      expect(pages.createPage).toBeInstanceOf(Function)
      expect(pages.updatePage).toBeUndefined()

      expect(emit).toHaveBeenCalledWith('create', page)
      expect(emit).toHaveBeenCalledTimes(1)
    })
  })
})

test('create managed pages with plugin api', async () => {
  await createApp(function (api) {
    api.createManagedPages((pages) => {
      const emit = jest.spyOn(api._app.pages._events, 'emit')

      const page = pages.createPage({
        path: '/page',
        component: './__fixtures__/DefaultPage.vue'
      })

      expect(page.internal.isManaged).toEqual(true)

      expect(pages.graphql).toBeInstanceOf(Function)
      expect(pages.getContentType).toBeInstanceOf(Function)
      expect(pages.createPage).toBeInstanceOf(Function)
      expect(pages.updatePage).toBeInstanceOf(Function)
      expect(pages.removePage).toBeInstanceOf(Function)
      expect(pages.removePageByPath).toBeInstanceOf(Function)
      expect(pages.removePagesByComponent).toBeInstanceOf(Function)
      expect(pages.findAndRemovePages).toBeInstanceOf(Function)
      expect(pages.findPages).toBeInstanceOf(Function)
      expect(pages.findPage).toBeInstanceOf(Function)

      expect(emit).toHaveBeenCalledWith('create', page)
      expect(emit).toHaveBeenCalledTimes(1)
    })
  })
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
  expect(page.chunkName).toEqual('page--fixtures--paged-page-vue')
})

test('create page with context', async () => {
  const { pages: { createPage }} = await createApp()

  const page = createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue',
    context: { test: true }
  })

  expect(page.context).toMatchObject({ test: true })
  expect(page.queryVariables).toMatchObject({ test: true })
})

test('create page with query context', async () => {
  const { pages: { createPage }} = await createApp()

  const page = createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue',
    queryVariables: { test: true }
  })

  expect(page.context).toBeNull()
  expect(page.queryVariables).toMatchObject({ test: true })
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

test('allways include a /404 page', async () => {
  const app = await createApp()
  const notFound = app.pages.findPage({ path: '/404' })

  expect(notFound.path).toEqual('/404')
  expect(notFound.chunkName).toEqual('page--app--pages--404-vue')
})

test('cache parsed components', async () => {
  const { pages: { _parser, createPage }} = await createApp()

  createPage({ path: '/page/1', component: './__fixtures__/PagedPage.vue' })
  createPage({ path: '/page/2', component: './__fixtures__/PagedPage.vue' })
  createPage({ path: '/page/3', component: './__fixtures__/PagedPage.vue' })

  expect(Object.keys(_parser._cached)).toHaveLength(2) // includes /404
})

test('update page', async () => {
  const { pages, pages: { createPage, updatePage }} = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')

  const page1 = createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(page1.path).toEqual('/page')
  expect(page1.route).toEqual('/page')
  expect(page1.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
  expect(page1.chunkName).toEqual('page--fixtures--default-page-vue')

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

test('remove page', async () => {
  const { pages } = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')

  const page = pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(pages.allPages()).toHaveLength(2)

  pages.removePage(page)

  expect(pages.allPages()).toHaveLength(1)
  expect(emit).toHaveBeenCalledTimes(2)
})

test('remove page by path', async () => {
  const { pages } = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')

  pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(pages.allPages()).toHaveLength(2)

  pages.removePageByPath('/page')

  expect(pages.allPages()).toHaveLength(1)
  expect(emit).toHaveBeenCalledTimes(2)
})

test('remove pages by component', async () => {
  const { resolve, pages } = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')
  const component = resolve('./__fixtures__/DefaultPage.vue')

  pages.createPage({ path: '/page-1', component })
  pages.createPage({ path: '/page-2', component })
  pages.createPage({ path: '/page-3', component })

  expect(pages.allPages()).toHaveLength(4)

  pages.removePagesByComponent(component)

  expect(pages._watched[component]).toBeUndefined()
  expect(pages.allPages()).toHaveLength(1)
  expect(emit).toHaveBeenCalledTimes(6)
})

test('find and reomve pages', async () => {
  const { resolve, pages } = await createApp()
  const emit = jest.spyOn(pages._events, 'emit')
  const component = resolve('./__fixtures__/DefaultPage.vue')

  pages.createPage({ path: '/page-1', component })
  pages.createPage({ path: '/page-2', component })
  pages.createPage({ path: '/page-3', component })

  expect(pages.allPages()).toHaveLength(4)

  pages.findAndRemovePages({ component })

  expect(pages._watched[component]).toBeUndefined()
  expect(pages.allPages()).toHaveLength(1)
  expect(emit).toHaveBeenCalledTimes(6)
})

test('api.createManagedPages() should only be called once', async () => {
  const createPages = jest.fn()
  const createManagedPages = jest.fn()

  const app = await createApp(function (api) {
    api.createPages(createPages)
    api.createManagedPages(createManagedPages)
  })

  await app.createPages()
  await app.createPages()
  await app.createPages()

  expect(createPages.mock.calls).toHaveLength(4)
  expect(createManagedPages.mock.calls).toHaveLength(1)
})

test('garbage collect unmanaged pages', async () => {
  let maxPages = 10

  const app = await createApp(function (api) {
    api.createPages(({ createPage }) => {
      for (let i = 1; i <= maxPages; i++) {
        createPage({ path: `/page-${i}`, component: './__fixtures__/DefaultPage.vue' })
      }
    })

    api.createManagedPages(({ createPage }) => {
      createPage({ path: '/managed-page-1', component: './__fixtures__/PagedPage.vue' })
      createPage({ path: '/managed-page-2', component: './__fixtures__/PagedPage.vue' })
    })
  })

  expect(app.pages.allPages()).toHaveLength(13)

  maxPages = 5
  await app.createPages()

  expect(app.pages.allPages()).toHaveLength(8)

  maxPages = 1
  await app.createPages()

  expect(app.pages.allPages()).toHaveLength(4)
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

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
