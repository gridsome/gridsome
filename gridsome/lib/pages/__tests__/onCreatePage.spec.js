const App = require('../../app/App')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}

test('remove and create a new page', async () => {
  await createApp(api => {
    let originalPage
    api.createManagedPages(pages => {
      originalPage = pages.createPage({
        path: '/',
        component: './__fixtures__/DefaultPage.vue',
        context: {
          foo: 'bar'
        }
      })
    })
    api.onCreatePage((options, { removePage, createPage }) => {
      if (options.path === '/') {
        removePage(options)
        createPage({ ...options, path: '/test' })
      }
    })
    api._app.hooks.bootstrap.tap('test', () => {
      const { pages: { _pages: store } } = api._app
      const page = store.by('path', '/test')
      expect(page).not.toBeUndefined()
      expect(store.by('path', '/')).toBeUndefined()
      expect(page.internal.isManaged).toBe(true)
      expect(page.internal.owner).toEqual(originalPage.internal.owner)
      expect(page.internal.digest).toEqual(originalPage.internal.digest)
      expect(store.data).toHaveLength(2)
    })
  })
})

test('remove and create a new page in multiple hooks', async () => {
  await createApp(api => {
    api.createManagedPages(pages => {
      pages.createPage({
        path: '/',
        component: './__fixtures__/DefaultPage.vue'
      })
    })
    api.onCreatePage((options, { removePage, createPage }) => {
      if (options.path === '/') {
        createPage({ ...options, path: '/test' })
        createPage({ ...options, path: '/test-2' })
        removePage(options)
      }
    })
    api.onCreatePage((options, { removePage, createPage }) => {
      if (options.path === '/test-2') {
        removePage(options)
        createPage({ ...options, path: '/en/test' })
      }
    })
    api._app.hooks.bootstrap.tap('test', () => {
      const { pages: { _pages: store } } = api._app
      expect(store.by('path', '/test')).toBeDefined()
      expect(store.by('path', '/en/test')).toBeDefined()
      expect(store.by('path', '/test-2')).toBeUndefined()
      expect(store.by('path', '/')).toBeUndefined()
      expect(store.data).toHaveLength(3)
    })
  })
})

test('skip listeners if the page was removed', async () => {
  const onCreatePage1 = jest.fn((options, { removePage }) => {
    if (options.path === '/') {
      removePage(options)
    }
  })
  const onCreatePage2 = jest.fn()

  await createApp(api => {
    api.createManagedPages(pages => {
      pages.createPage({
        path: '/',
        component: './__fixtures__/DefaultPage.vue'
      })
    })
    api.onCreatePage(onCreatePage1)
    api.onCreatePage(onCreatePage2)
    api._app.hooks.bootstrap.tap('test', () => {
      const { pages: { _pages: store } } = api._app
      expect(store.by('path', '/')).toBeUndefined()
      expect(store.data).toHaveLength(1)
    })
  })

  expect(onCreatePage1.mock.calls).toHaveLength(2)
  expect(onCreatePage2.mock.calls).toHaveLength(1)
})

test('skip pages from api.createPages()', async () => {
  const onCreatePage = jest.fn()

  await createApp(api => {
    api.createPages(pages => {
      pages.createPage({
        path: '/a',
        component: './__fixtures__/DefaultPage.vue'
      })
      pages.createPage({
        path: '/b',
        component: './__fixtures__/DefaultPage.vue'
      })
    })
    api.onCreatePage(onCreatePage)
  })

  expect(onCreatePage.mock.calls).toHaveLength(1)
})
