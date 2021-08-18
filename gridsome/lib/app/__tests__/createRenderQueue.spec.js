const path = require('path')
const App = require('../App')
const createApp = require('../index')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')
const createRenderQueue = require('../build/createRenderQueue')

test('create render queue for basic project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-basic')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)

  const renderQueue = createRenderQueue(app)
  const renderPaths = renderQueue.map(entry => entry.publicPath).sort()

  expect(renderPaths).toEqual(expect.arrayContaining([
    '/',
    '/404.html',
    '/about/',
    '/about-us/',
    '/docs/1/',
    '/docs/1/extra/',
    '/docs/2/',
    '/docs/2/2/',
    '/docs/2/3/',
    '/docs/2/extra/',
    '/docs/3/',
    '/docs/3/extra/',
    '/docs/4/',
    '/docs/4/extra/',
    '/docs/5/',
    '/pages/1/',
    '/pages/2/'
  ]))

  expect(renderPaths).toHaveLength(18)
})

test('create render queue for blog project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-blog')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)
  const queue = createRenderQueue(app)

  const renderPaths = queue.map(entry => entry.publicPath).sort()

  expect(renderPaths).toEqual(expect.arrayContaining([
    '/',
    '/2/',
    '/404.html',
    '/about/',
    '/category/first/',
    '/category/first/2/',
    '/category/second/',
    '/exclude-me/',
    '/first-post/',
    '/fourth-post/',
    '/post-10/',
    '/post-11/',
    '/post-12/',
    '/post-13/',
    '/post-4/',
    '/post-5/',
    '/post-6/',
    '/post-7/',
    '/post-8/',
    '/post-9/',
    '/second-post/',
    '/skip-me/',
    '/tag/1/extra/',
    '/tag/2/extra/',
    '/tag/3/extra/',
    '/tag/4/extra/',
    '/tag/4/extra/2/',
    '/tag/first-tag/',
    '/tag/fourth-tag/',
    '/tag/fourth-tag/2/',
    '/tag/second-tag/',
    '/tag/third-tag/',
    '/third-post/'
  ]))

  expect(renderPaths).not.toContain('/3')
  expect(renderPaths).not.toContain('/category/first/3')
  expect(renderPaths).not.toContain('/tag/4/extra/3')
  expect(renderPaths).toHaveLength(33)
})

test('create render queue for createPages hook', async () => {
  const app = await _createApp(function plugin (api) {
    api.loadSource(async store => {
      const posts = api.store.addCollection({ typeName: 'Post', route: '/post/:id/' })
      const movies = api.store.addCollection({ typeName: 'Movie' })

      for (let i = 1; i <= 3; i++) {
        posts.addNode({ id: String(i), fields: { author: '2' }})
      }

      movies.addNode({
        id: '1',
        path: '/movie/one/',
        fields: {
          posts: [
            store.createReference('Post', '1')
          ]
        }
      })

      movies.addNode({
        id: '2',
        path: '/movie/two/',
        fields: {
          posts: [
            store.createReference('Post', '1'),
            store.createReference('Post', '2')
          ]
        }
      })

      movies.addNode({
        id: '3',
        path: '/movie/three/',
        fields: {
          posts: [
            store.createReference('Post', '1')
          ]
        }
      })
    })

    api.createPages(async ({ getCollection, createRoute, createPage, graphql }) => {
      const posts = getCollection('Post')

      createPage({
        path: '/about',
        component: './__fixtures__/DefaultPage.vue'
      })

      createPage({
        path: '/blog/',
        component: './__fixtures__/PagedPage.vue',
        context: { perPage: 2 }
      })

      const route = createRoute({
        path: '/article/:id',
        component: './__fixtures__/DefaultTemplate.vue'
      })

      for (let i = 1; i <= 3; i++) {
        const node = posts.getNode(String(i))

        route.addPage({
          path: `/article/${node.id}`,
          queryVariables: node
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

  const renderQueue = createRenderQueue(app)
  const paths = renderQueue.map(entry => entry.publicPath)

  expect(paths).toEqual(expect.arrayContaining([
    '/about/',
    '/movie/three/',
    '/movie/two/',
    '/movie/one/',
    '/404.html',
    '/blog/',
    '/blog/2/',
    '/article/1/',
    '/article/1/2/',
    '/article/2/',
    '/article/3/'
  ]))
  expect(paths).toHaveLength(11)

  renderQueue.forEach(entry => {
    expect(entry.type).toBeDefined()
    expect(entry.path).toBeDefined()
    expect(entry.dataOutput).toBeDefined()
    expect(entry.htmlOutput).toBeDefined()
    expect(entry.pageId).toBeDefined()
    expect(entry.routeId).toBeDefined()
  })
})

describe('dynamic pages', () => {
  const _createRenderQueue = async () => {
    const app = await _createApp()
    const component = './__fixtures__/DefaultPage.vue'

    app.pages.createPage({ path: '/', component })
    app.pages.createPage({ path: '/ab', component })
    app.pages.createPage({ path: '/ac', component })
    app.pages.createPage({ path: '/aa', component })
    app.pages.createPage({ path: '/a/b', component })
    app.pages.createPage({ path: '/a/:b', component })
    app.pages.createPage({ path: '/a/:b(\\d+)', component })
    app.pages.createPage({ path: '/a/:b*', component })
    app.pages.createPage({ path: '/a/:b+', component })

    const renderQueue = createRenderQueue(app)

    return { app, renderQueue }
  }

  test('render queue for dynamic pages', async () => {
    const { renderQueue } = await _createRenderQueue()
    const paths = renderQueue.map(entry => entry.publicPath)

    expect(paths).toEqual([
      '/a/b/',
      '/a/:b(\\d+)',
      '/a/:b',
      '/a/:b*',
      '/a/:b+',
      '/aa/',
      '/ab/',
      '/ac/',
      '/404.html',
      '/'
    ])
  })

  test('html output paths for dynamic pages', async () => {
    const { app, renderQueue } = await _createRenderQueue()

    const outputs = renderQueue.map(entry =>
      path.relative(app.config.outputDir, entry.htmlOutput)
    )

    expect(outputs).toEqual([
      'a/b/index.html',
      'a/_b_d_plus.html',
      'a/_b.html',
      'a/_b_star.html',
      'a/_b_plus.html',
      'aa/index.html',
      'ab/index.html',
      'ac/index.html',
      '404.html',
      'index.html'
    ])
  })

  test('redirects for dynamic pages', async () => {
    const { app, renderQueue } = await _createRenderQueue()
    const redirects = app.hooks.redirects.call([], renderQueue)

    const expected = [
      ['/a/:b(\\d+)', '/a/_b_d_plus.html', 200],
      ['/a/:b', '/a/_b.html', 200],
      ['/a/:b*', '/a/_b_star.html', 200],
      ['/a/:b+', '/a/_b_plus.html', 200]
    ]

    expect(redirects).toHaveLength(4)

    for (const [index, [from, to, status]] of expected.entries()) {
      expect(redirects[index]).toMatchObject({ from, to, status })
    }
  })
})

async function _createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
