const path = require('path')
const App = require('../App')
const { createRenderQueue } = require('../pages')
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

test('generate render queue', async () => {
  const app = await createApp(function plugin (api) {
    api.loadSource(async store => {
      const posts = api.store.addContentType({ typeName: 'Post', route: '/post/:id' })
      const movies = api.store.addContentType({ typeName: 'Movie' })

      for (let i = 1; i <= 3; i++) {
        posts.addNode({ id: String(i), fields: { author: '2' }})
      }

      movies.addNode({
        id: '1',
        path: '/movie/one',
        fields: {
          posts: [
            store.createReference('Post', '1')
          ]
        }
      })

      movies.addNode({
        id: '2',
        path: '/movie/two',
        fields: {
          posts: [
            store.createReference('Post', '1'),
            store.createReference('Post', '2')
          ]
        }
      })

      movies.addNode({
        id: '3',
        path: '/movie/three',
        fields: {
          posts: [
            store.createReference('Post', '1')
          ]
        }
      })
    })

    api.createPages(async ({ store, createPage, graphql }) => {
      const posts = store.getContentType('Post')

      createPage({
        path: '/about',
        component: './__fixtures__/DefaultPage.vue'
      })

      createPage({
        path: '/blog',
        component: './__fixtures__/PagedPage.vue',
        context: { perPage: 2 }
      })

      for (let i = 1; i <= 3; i++) {
        const node = posts.getNode(String(i))

        createPage({
          route: '/post/:id',
          path: node.path,
          component: './__fixtures__/DefaultTemplate.vue',
          context: node
        })
      }

      const movies = await graphql(`query {
        allMovie {
          edges {
            node {
              id
              path
            }
          }
        }
      }`)

      for (const edge of movies.data.allMovie.edges) {
        createPage({
          path: edge.node.path,
          component: './__fixtures__/MovieTemplate.vue',
          context: edge.node
        })
      }
    })
  })

  const queue = createRenderQueue([], app)
  const paths = queue.map(entry => entry.path)

  expect(paths).toEqual(expect.arrayContaining([
    '/about',
    '/movie/three',
    '/movie/two',
    '/movie/one',
    '/404',
    '/blog',
    '/blog/2',
    '/post/1',
    '/post/1/2',
    '/post/2',
    '/post/3'
  ]))
})

async function createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
