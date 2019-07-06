const path = require('path')
const App = require('../../app/App')
const createApp = require('../../app/index')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('create render queue for basic project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-basic')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)

  const renderQueue = await app.hooks.renderQueue.promise([], app)
  const renderPaths = renderQueue.map(entry => entry.path).sort()

  expect(renderPaths).toEqual(expect.arrayContaining([
    '/',
    '/404',
    '/about',
    '/about-us',
    '/docs/1',
    '/docs/1/extra',
    '/docs/2',
    '/docs/2/2',
    '/docs/2/3',
    '/docs/2/extra',
    '/docs/3',
    '/docs/3/extra',
    '/docs/4',
    '/docs/4/extra',
    '/docs/5',
    '/pages/1',
    '/pages/2'
  ]))

  expect(renderPaths).toHaveLength(18)
})

test('create render queue for blog project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-blog')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)
  const queue = await app.hooks.renderQueue.promise([], app)

  const renderPaths = queue.map(entry => entry.path).sort()

  expect(renderPaths).toEqual(expect.arrayContaining([
    '/',
    '/2',
    '/404',
    '/about',
    '/category/first',
    '/category/first/2',
    '/category/second',
    '/exclude-me',
    '/first-post',
    '/fourth-post',
    '/post-10',
    '/post-11',
    '/post-12',
    '/post-13',
    '/post-4',
    '/post-5',
    '/post-6',
    '/post-7',
    '/post-8',
    '/post-9',
    '/second-post',
    '/skip-me',
    '/tag/1/extra',
    '/tag/2/extra',
    '/tag/3/extra',
    '/tag/4/extra',
    '/tag/4/extra/2',
    '/tag/first-tag',
    '/tag/fourth-tag',
    '/tag/fourth-tag/2',
    '/tag/second-tag',
    '/tag/third-tag',
    '/third-post'
  ]))

  expect(renderPaths).not.toContain('/3')
  expect(renderPaths).not.toContain('/category/first/3')
  expect(renderPaths).not.toContain('/tag/4/extra/3')
  expect(renderPaths).toHaveLength(33)
})

test('create render queue for createPages hook', async () => {
  const app = await _createApp(function plugin (api) {
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

    api.createPages(async ({ getContentType, createPage, graphql }) => {
      const posts = getContentType('Post')

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
          route: '/article/:id',
          path: `/article/${node.id}`,
          component: './__fixtures__/DefaultTemplate.vue',
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

  const renderQueue = await app.hooks.renderQueue.promise([], app)
  const paths = renderQueue.map(entry => entry.path)

  expect(paths).toEqual(expect.arrayContaining([
    '/about',
    '/movie/three',
    '/movie/two',
    '/movie/one',
    '/404',
    '/blog',
    '/blog/2',
    '/article/1',
    '/article/1/2',
    '/article/2',
    '/article/3'
  ]))
  expect(paths).toHaveLength(11)

  renderQueue.forEach(entry => {
    expect(entry.path).toBeDefined()
    expect(entry.htmlOutput).toBeDefined()
    expect(entry.internal.pageId).toBeDefined()
    expect(entry.internal.routeId).toBeDefined()
  })
})

async function _createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
