const path = require('path')
const App = require('../../app/App')
const { pathToFilePath } = require('../utils')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

const waitForWatcher = (watcher, event = 'ready') => {
  return new Promise((resolve, reject) => {
    watcher.on('error', reject)
    watcher.on(event, resolve)
  })
}

describe('utilities', () => {
  test('pathToFilePath()', () => {
    expect(pathToFilePath('')).toEqual('/index.html')
    expect(pathToFilePath('/')).toEqual('/index.html')
    expect(pathToFilePath('a')).toEqual('/a/index.html')
    expect(pathToFilePath('/a')).toEqual('/a/index.html')
    expect(pathToFilePath('/a/')).toEqual('/a/index.html')
    expect(pathToFilePath('/a b')).toEqual('/a b/index.html')
    expect(pathToFilePath('/a/:b')).toEqual('/a/_b.html')
    expect(pathToFilePath('/:a/')).toEqual('/_a.html')
    expect(pathToFilePath('/:a-b/')).toEqual('/_a_b.html')
    expect(pathToFilePath('/:a/:b')).toEqual('/_a/_b.html')
    expect(pathToFilePath('/:a(\\d+)')).toEqual('/_a_d_plus.html')
    expect(pathToFilePath('/:a/(.*)')).toEqual('/_a/_dot_star.html')
    expect(pathToFilePath('/a/:b/:c?')).toEqual('/a/_b/_c_qn.html')
    expect(pathToFilePath('/a/:b/(.*)')).toEqual('/a/_b/_dot_star.html')
    expect(pathToFilePath('/a-:b(\\d+)')).toEqual('/_a_b_d_plus.html')
    expect(pathToFilePath('/(a|b)')).toEqual('/_a_pipe_b.html')
    expect(pathToFilePath('/:a*')).toEqual('/_a_star.html')
    expect(pathToFilePath('/:a+')).toEqual('/_a_plus.html')
    expect(pathToFilePath('/(.*)')).toEqual('/_dot_star.html')
  })
})

test('create page', async () => {
  const { pages } = await createApp()

  const component = './__fixtures__/DefaultPage.vue'
  const page = pages.createPage({ path: '/page', component })

  expect(page.id).toEqual('76a99cb48c7cfa8dbb91bba1ced599cd')
  expect(page.path).toEqual('/page')
  expect(page.publicPath).toEqual('/page/')
  expect(page.context).toMatchObject({})
  expect(page.internal.isDynamic).toEqual(false)
  expect(page.internal.route).toEqual('6823d06059b8ddddbf443e850beecbe9')
  expect(page.internal.query).toMatchObject({
    paginate: null,
    variables: {},
    filters: {}
  })

  const route = pages.getRoute(page.internal.route)

  expect(route.type).toEqual('static')
  expect(route.path).toEqual('/page/')
  expect(route.id).toEqual('6823d06059b8ddddbf443e850beecbe9')
  expect(route.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
  expect(route.internal.regexp).toEqual(/^\/page(?:\/)?$/i)
  expect(route.internal.query.document).toBeNull()
  expect(route.internal.isDynamic).toEqual(false)

  expect(pages._routes.count()).toEqual(2)
  expect(pages._pages.count()).toEqual(2)
})

test('create page with plugin api', async () => {
  await createApp(api => {
    api.createPages(pages => {
      expect(pages.graphql).toBeInstanceOf(Function)
      expect(pages.getCollection).toBeInstanceOf(Function)
      expect(pages.createPage).toBeInstanceOf(Function)
      expect(pages.updatePage).toBeUndefined()

      pages.createPage({
        id: '1',
        path: '/',
        component: './__fixtures__/DefaultPage.vue'
      })

      const page = api._app.pages._pages.by('path', '/')
      const route = api._app.pages.getRoute(page.internal.route)

      expect(page.id).toEqual('1')
      expect(page.path).toEqual('/')
      expect(page.publicPath).toEqual('/')
      expect(page.context).toMatchObject({})
      expect(page.internal.isManaged).toEqual(false)

      expect(route.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))
      expect(route.internal.query.document).toBeNull()
      expect(route.internal.path).toEqual('/')
      expect(route.pages()).toHaveLength(1)
    })
  })
})

test('create managed pages with plugin api', async () => {
  await createApp(api => {
    api.createManagedPages((pages) => {
      pages.createPage({
        path: '/page',
        component: './__fixtures__/DefaultPage.vue'
      })

      const page = api._app.pages._pages.by('path', '/page')
      const route = api._app.pages.getRoute(page.internal.route)

      expect(page.internal.isManaged).toEqual(true)
      expect(route.internal.isManaged).toEqual(true)

      expect(pages.graphql).toBeInstanceOf(Function)
      expect(pages.getCollection).toBeInstanceOf(Function)
      expect(pages.createPage).toBeInstanceOf(Function)
      expect(pages.updatePage).toBeInstanceOf(Function)
      expect(pages.removePage).toBeInstanceOf(Function)
      expect(pages.removePageByPath).toBeInstanceOf(Function)
      expect(pages.removePagesByComponent).toBeInstanceOf(Function)
      expect(pages.findAndRemovePages).toBeInstanceOf(Function)
    })
  })
})

test('create page with pagination', async () => {
  const { pages } = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post')
    })
  })

  const page = pages.createPage({
    path: '/page',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(page.id).toEqual('76a99cb48c7cfa8dbb91bba1ced599cd')
  expect(page.path).toEqual('/page')
  expect(page.publicPath).toEqual('/page/')
  expect(page.internal.query.paginate.typeName).toEqual('Post')

  const route = pages.getRoute(page.internal.route)

  expect(route.path).toEqual('/page/:page(\\d+)?/')
  expect(route.internal.path).toEqual('/page')
  expect(route.internal.regexp).toEqual(/^\/page(?:\/(\d+))?(?:\/)?$/i)
  expect(route.internal.query.directives).toHaveProperty('paginate')
})

test('create page with custom context', async () => {
  const { pages } = await createApp()

  const page = pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue',
    context: { test: true }
  })

  expect(page.context).toMatchObject({ test: true })
})

test('create page with query context', async () => {
  const { pages } = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Movie')
    })
  })

  const queryVariables = { id: '1' }

  const page = pages.createPage({
    path: '/page',
    component: './__fixtures__/MovieTemplate.vue',
    queryVariables
  })

  expect(page.context).toMatchObject({})
  expect(page.internal.query.variables).toMatchObject({ id: '1' })
  expect(page.internal.queryVariables).toEqual(queryVariables)
})

test('always include a /404 page', async () => {
  const app = await createApp()
  const page = app.pages._pages.by('path', '/404')

  expect(page.path).toEqual('/404')
  expect(page.publicPath).toEqual('/404/')
})

test('cache parsed components', async () => {
  const { pages } = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post')
    })
  })

  const parseComponent = jest.spyOn(pages.hooks.parseComponent.for('vue')._x, 0)

  pages.createPage({ path: '/page/1', component: './__fixtures__/PagedPage.vue' })
  pages.createPage({ path: '/page/2', component: './__fixtures__/PagedPage.vue' })
  pages.createPage({ path: '/page/3', component: './__fixtures__/PagedPage.vue' })

  expect(parseComponent).toHaveBeenCalledTimes(1)
})

test('update page', async () => {
  const { pages } = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post')
    })
  })

  const watcher = pages.createWatcher()

  const page1 = pages.createPage({
    id: '1',
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  const route1 = pages.getRoute(page1.internal.route)

  expect(page1.path).toEqual('/page')
  expect(page1.publicPath).toEqual('/page/')
  expect(route1.component).toEqual(path.join(__dirname, '__fixtures__', 'DefaultPage.vue'))

  await waitForWatcher(watcher, 'ready')

  expect(watcher.getWatched()).toMatchObject({
    [path.join(__dirname, '__fixtures__')]: ['DefaultPage.vue']
  })

  const page2 = pages.updatePage({
    id: '1',
    path: '/page',
    component: './__fixtures__/PagedPage.vue'
  })

  const route2 = pages.getRoute(page2.internal.route)

  expect(page2.id).toEqual(page1.id)
  expect(page2.path).toEqual('/page')
  expect(page2.publicPath).toEqual('/page/')
  expect(route2.component).toEqual(path.join(__dirname, '__fixtures__', 'PagedPage.vue'))
  expect(route2.path).toEqual('/page/:page(\\d+)?/')
  expect(pages.pages()).toHaveLength(2) // includes /404

  await waitForWatcher(watcher, 'add')
  await waitForWatcher(watcher, 'add')

  expect(watcher.getWatched()).toMatchObject({
    [path.join(__dirname, '__fixtures__')]: ['PagedPage.gql', 'PagedPage.vue']
  })

  await pages.closeWatcher()
})

test('remove page', async () => {
  const { pages } = await createApp()

  const watcher = pages.createWatcher()

  const page = pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  await waitForWatcher(watcher, 'ready')

  expect(pages._pages.data).toHaveLength(2)
  expect(watcher.getWatched()).toMatchObject({
    [path.join(__dirname, '__fixtures__')]: ['DefaultPage.vue']
  })

  pages.removePage(page.id)

  expect(pages._pages.data).toHaveLength(1)
  expect(watcher.getWatched()).toMatchObject({})

  await pages.closeWatcher()
})

test('remove page by path', async () => {
  const { pages } = await createApp()

  pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(pages.pages()).toHaveLength(2)

  pages.removePageByPath('/page')

  expect(pages.pages()).toHaveLength(1)
})

test('remove pages by component', async () => {
  const { resolve, pages } = await createApp()
  const component = resolve('./__fixtures__/DefaultPage.vue')
  const watcher = pages.createWatcher()

  pages.createPage({ path: '/page-1', component })
  pages.createPage({ path: '/page-2', component })
  pages.createPage({ path: '/page-3', component })

  await waitForWatcher(watcher, 'add')

  expect(pages.pages()).toHaveLength(4)

  pages.removePagesByComponent(component)

  expect(pages.pages()).toHaveLength(1)
  expect(watcher.getWatched()).toMatchObject({})

  await pages.closeWatcher()
})

test('find and remove pages by query', async () => {
  const { pages } = await createApp()

  pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  expect(pages.pages()).toHaveLength(2)

  pages.findAndRemovePages({ path: { '$eq': '/page' }})

  expect(pages.pages()).toHaveLength(1)
} )

test('find pages by query', async () => {
  const { pages } = await createApp()

  const postSlugs = [
    'lorem-ipsum-dolor-amet-brunch',
    'tofu-schlitz-knausgaard-lomo',
    'vaporware-dreamcatcher-tousled',
    'godard-ramps-butcher-mumblecore',
    'listicle-tattooed-quinoa-poke-occupy'
  ]

  for (const slug of postSlugs) {
    pages.createPage({
      path: `/posts/${slug}`,
      component: './__fixtures__/DefaultPage.vue'
    })
  }


  expect(pages.pages()).toHaveLength(6)

  let matchingPages = pages.findPages({ path: { '$eq': '/posts/lorem-ipsum-dolor-amet-brunch' }})
  expect(matchingPages).toHaveLength(1)

  matchingPages = pages.findPages({ path: { '$contains': 'posts' }})
  expect(matchingPages).toHaveLength(5)
})

test('find page by query', async () => {
  const { pages } = await createApp()

  const postSlugs = [
    'lorem-ipsum-dolor-amet-brunch',
    'tofu-schlitz-knausgaard-lomo',
    'vaporware-dreamcatcher-tousled',
    'godard-ramps-butcher-mumblecore',
    'listicle-tattooed-quinoa-poke-occupy'
  ]

  for (const slug of postSlugs) {
    pages.createPage({
      path: `/posts/${slug}`,
      component: './__fixtures__/DefaultPage.vue'
    })
  }

  expect(pages.pages()).toHaveLength(6)

  const pathToMatch = '/posts/lorem-ipsum-dolor-amet-brunch'
  const matchingPage = pages.findPage({ path: { '$eq': pathToMatch } })

  expect(matchingPage).toEqual(
    expect.objectContaining({ path: pathToMatch })
  )
})

test('api.createManagedPages() should only be called once', async () => {
  const createPages = jest.fn()
  const createManagedPages = jest.fn()

  const app = await createApp(api => {
    api.createPages(createPages)
    api.createManagedPages(createManagedPages)
  })

  await app.plugins.createPages()
  await app.plugins.createPages()
  await app.plugins.createPages()

  expect(createPages.mock.calls).toHaveLength(4)
  expect(createManagedPages.mock.calls).toHaveLength(1)
})

test('watch extra files', async () => {
  let watchFiles = [path.join(__dirname, '__fixtures__', 'DefaultPage.vue')]

  const { pages } = await createApp(({ _app: { pages } }) => {
    pages.hooks.parseComponent.for('txt').tap('TxtParserPlugin', () => ({ watchFiles }))
    pages.createWatcher()
  })

  const page1 = pages.createPage({ path: '/page-1', component: './__fixtures__/Component.txt' })
  const route1 = pages.getRoute(page1.internal.route)

  await waitForWatcher(pages._watcher, 'ready')

  expect(route1.internal.dependencies).toHaveLength(2)
  expect(pages._watcher.getWatched()).toMatchObject({
    [path.join(__dirname, '__fixtures__')]: ['Component.txt', 'DefaultPage.vue']
  })

  watchFiles = []

  const page2 = pages.updatePage({ path: '/page-1', component: './__fixtures__/Component.txt' })
  const route2 = pages.getRoute(page2.internal.route)

  expect(route2.internal.dependencies).toHaveLength(1)
  expect(pages._watcher.getWatched()).toMatchObject({
    [path.join(__dirname, '__fixtures__')]: ['Component.txt']
  })

  await pages.closeWatcher()
})

test('garbage collect unmanaged pages', async () => {
  let maxPages = 10

  const app = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post')
    })

    api.createPages(({ createPage }) => {
      for (let i = 1; i <= maxPages; i++) {
        createPage({ path: `/page-${i}`, component: './__fixtures__/DefaultPage.vue' })
      }
    })

    api.createManagedPages(({ createPage, createRoute }) => {
      createPage({ path: '/managed-page-1', component: './__fixtures__/PagedPage.vue' })
      createPage({ path: '/managed-page-2', component: './__fixtures__/PagedPage.vue' })

      const pages = createRoute({ path: '/managed/:id', component: './__fixtures__/PagedPage.vue' })

      pages.addPage({ path: '/managed/one' })
      pages.addPage({ path: '/managed/two' })
    })
  })

  expect(app.pages.routes()).toHaveLength(14)
  expect(app.pages.pages()).toHaveLength(15)

  maxPages = 5
  await app.plugins.createPages()

  expect(app.pages.routes()).toHaveLength(9)
  expect(app.pages.pages()).toHaveLength(10)

  maxPages = 1
  await app.plugins.createPages()

  expect(app.pages.routes()).toHaveLength(5)
  expect(app.pages.pages()).toHaveLength(6)

  maxPages = 2
  await app.plugins.createPages()

  expect(app.pages.routes()).toHaveLength(6)
  expect(app.pages.pages()).toHaveLength(7)
})

test('override page with similar path', async () => {
  const { pages } = await createApp(api => {
    api.loadSource(store => {
      store.addCollection('Post')
    })
  })

  pages.createPage({
    path: '/page',
    component: './__fixtures__/DefaultPage.vue'
  })

  pages.createPage({
    path: '/page/',
    component: './__fixtures__/PagedPage.vue'
  })

  expect(pages.pages()).toHaveLength(2) // includes /404
})

test('sort routes by priority', async () => {
  const { pages } = await createApp()
  const component = './__fixtures__/DefaultPage.vue'

  pages.createRoute({ path: '/a/:b(.*)', component })
  pages.createPage({ path: '/', component })
  pages.createRoute({ path: '/:rest(\\d+)', component })
  pages.createRoute({ path: '/a/:b', component })
  pages.createRoute({ path: '/a/:b/:c+', component })
  pages.createRoute({ path: '/a/:b/:c(\\d+)?', component })
  pages.createRoute({ path: '/:a-:b', component })
  pages.createRoute({ path: '/a-:b-c', component })
  pages.createRoute({ path: '/:rest', component })
  pages.createPage({ path: '/a', component })
  pages.createPage({ path: '/a-b-c', component })
  pages.createRoute({ path: '/a-:b', component })
  pages.createRoute({ path: '/:rest(\\d+)?', component })
  pages.createRoute({ path: '/a/:b/c', component })
  pages.createPage({ path: '/a/b', component })
  pages.createPage({ path: '/a/b/c', component })

  const paths = pages.routes().map(route => route.path)

  expect(paths).toEqual([
    '/a/b/c/',
    '/a/:b/c/',
    '/a/:b/:c(\\d+)?/',
    '/a/:b/:c+/',
    '/a/b/',
    '/a/:b/',
    '/a/:b(.*)/',
    '/a-b-c/',
    '/a/',
    '/404/',
    '/a-:b-c/',
    '/a-:b/',
    '/:rest(\\d+)/',
    '/:rest(\\d+)?/',
    '/:a-:b/',
    '/:rest/',
    '/'
  ])
})

test('get matched route by path', async () => {
  const { pages } = await createApp()
  const component = './__fixtures__/DefaultPage.vue'

  const home = pages.createRoute({ path: '/:page(\\d+)?', component })
  home.addPage({ path: '/' })
  home.addPage({ path: '/2' })
  home.addPage({ path: '/3' })

  pages.createPage({ path: '/about', component })

  const user = pages.createRoute({ path: '/:foo', component })
  user.addPage({ path: '/bar' })

  const match1 = pages.getMatch('/2')
  const match2 = pages.getMatch('/bar')
  const match3 = pages.getMatch('/about/')

  expect(match1.params.page).toEqual('2')
  expect(match2.params.foo).toEqual('bar')
  expect(match3.params).toMatchObject({})
})

describe('dynamic pages', () => {
  test('create page', async () => {
    const { pages } = await createApp()

    const component = './__fixtures__/DefaultPage.vue'
    const page = pages.createPage({ path: '/user/:id', component })

    expect(page.id).toEqual('511565311da1006b674794018b58b80d')
    expect(page.path).toEqual('/user/:id')
    expect(page.context).toMatchObject({})
    expect(page.internal.isDynamic).toEqual(true)
    expect(page.internal.route).toEqual('9c1d306d222b94fa197459d7b9a32712')

    const route = pages.getRoute(page.internal.route)

    expect(route.type).toEqual('dynamic')
    expect(route.path).toEqual('/user/:id')
    expect(route.id).toEqual('9c1d306d222b94fa197459d7b9a32712')
    expect(route.options.name).toEqual('__user_id')
    expect(route.internal.regexp).toEqual(/^\/user\/([^\/]+?)(?:\/)?$/i) // eslint-disable-line no-useless-escape
    expect(route.internal.isDynamic).toEqual(true)
  })

  test('trim trailing slash', async () => {
    const { pages } = await createApp()

    const component = './__fixtures__/DefaultPage.vue'
    const page = pages.createPage({ path: '/products/:slug/', component })
    const route = pages.getRoute(page.internal.route)

    expect(page.path).toEqual('/products/:slug')
    expect(route.path).toEqual('/products/:slug')
  })
})

describe('create routes', () => {
  test('create route', async () => {
    const { pages } = await createApp(api => {
      api.loadSource(store => {
        store.addCollection('Post')
      })
    })

    const component = './__fixtures__/PagedTemplate.vue'
    const route = pages.createRoute({ component, path: '/page/:id' })

    expect(route.type).toEqual('static')
    expect(route.id).toEqual('97634d90358baad1bc2499987699ca68')
    expect(route.path).toEqual('/page/:id/:page(\\d+)?/')
    expect(route.internal.path).toEqual('/page/:id')
    expect(route.internal.isDynamic).toEqual(true)
    expect(route.internal.regexp).toEqual(/^\/page\/([^\/]+?)(?:\/(\d+))?(?:\/)?$/i) // eslint-disable-line no-useless-escape
  })

  test('add pages to route', async () => {
    const { pages } = await createApp(api => {
      api.loadSource(store => {
        store.addCollection('Movie')
      })
    })

    const component = './__fixtures__/MovieTemplate.vue'
    const meta = { digest: 'foo', isManaged: true }
    const route = pages.createRoute({ id: '1', component, path: '/page/:id' }, meta)
    const page1 = route.addPage({ id: '1', path: '/page/1', queryVariables: { id: '1' } })
    const page2 = route.addPage({ id: '2', path: '/page/2', context: { id: '2' } })

    expect(route.id).toEqual('1')
    expect(page1.id).toEqual('1')
    expect(page1.path).toEqual('/page/1')
    expect(page1.publicPath).toEqual('/page/1/')
    expect(page1.context).toEqual({})
    expect(page1.internal.digest).toEqual(route.internal.digest)
    expect(page1.internal.isManaged).toEqual(route.internal.isManaged)
    expect(page1.internal.query.variables).toMatchObject({ id: '1' })
    expect(page2.internal.query.variables).toMatchObject({ id: '2' })
  })

  test('fail if path doesn\'t math route path', async () => {
    const { pages } = await createApp()

    const route = pages.createRoute({
      component: './__fixtures__/DefaultPage.vue',
      path: '/page/:id(\\d+)'
    })

    expect(() => route.addPage({ path: '/page/test' })).toThrow('does not match')
  })

  test('remove route and its pages', async () => {
    const { pages } = await createApp(api => {
      api.loadSource(store => {
        store.addCollection('Post')
      })
    })

    const route = pages.createRoute({
      path: '/user/:id',
      component: './__fixtures__/PagedTemplate.vue'
    })

    route.addPage({ path: '/user/1' })
    route.addPage({ path: '/user/2' })
    route.addPage({ path: '/user/3' })

    expect(route.pages()).toHaveLength(3)

    pages.removeRoute(route.id)

    expect(route.pages()).toHaveLength(0)
    expect(pages.pages()).toHaveLength(1)
  })

  test('remove page by path', async () => {
    const { pages } = await createApp()

    const route = pages.createRoute({
      path: '/user/:id',
      component: './__fixtures__/DefaultPage.vue'
    })

    route.addPage({ path: '/user/1' })
    route.addPage({ path: '/user/2' })
    route.addPage({ path: '/user/3' })

    expect(route.pages()).toHaveLength(3)

    pages.removePageByPath('/user/2')

    expect(route.pages()).toHaveLength(2)
  })

  test('remove page by id', async () => {
    const { pages } = await createApp()

    const route = pages.createRoute({
      path: '/user/:id',
      component: './__fixtures__/DefaultPage.vue'
    })

    route.addPage({ path: '/user/1' })
    const remove = route.addPage({ path: '/user/2' })
    route.addPage({ path: '/user/3' })

    expect(route.pages()).toHaveLength(3)

    route.removePage(remove.id)

    expect(route.pages()).toHaveLength(2)
  })
})

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
