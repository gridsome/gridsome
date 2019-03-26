const path = require('path')
const App = require('../../app/App')
const createApp = require('../../app/index')
const createRenderQueue = require('../createRenderQueue')
const { BOOTSTRAP_PAGES } = require('../../utils/constants')

test('create render queue for basic project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-basic')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)
  const queue = createRenderQueue([], app)

  const renderPaths = queue.map(entry => entry.path)

  expect(renderPaths).toHaveLength(16)
  expect(renderPaths).toEqual(expect.arrayContaining([
    '/pages/2',
    '/docs/4/extra',
    '/docs/2/extra',
    '/docs/1/extra',
    '/404',
    '/',
    '/docs/3/extra',
    '/pages/1',
    '/docs/3',
    '/docs/4',
    '/docs/5',
    '/docs/2',
    '/docs/2/2',
    '/docs/2/3',
    '/docs/1'
  ]))
})

test('create render queue for blog project', async () => {
  const context = path.resolve(__dirname, '../../__tests__/__fixtures__/project-blog')
  const app = await createApp(context, undefined, BOOTSTRAP_PAGES)
  const queue = createRenderQueue([], app)

  const renderPaths = queue.map(entry => entry.path)

  expect(renderPaths).toHaveLength(25)
  expect(renderPaths).toEqual(expect.arrayContaining([
    '/404',
    '/about',
    '/',
    '/2',
    '/category/first',
    '/category/first/2',
    '/category/second',
    '/first-post',
    '/second-post',
    '/third-post',
    '/post-4',
    '/post-5',
    '/post-6',
    '/post-7',
    '/post-8',
    '/post-9',
    '/post-10',
    '/post-11',
    '/post-12',
    '/post-13',
    '/tag/first-tag',
    '/tag/second-tag',
    '/tag/third-tag',
    '/tag/fourth-tag',
    '/tag/fourth-tag/2'
  ]))

  expect(renderPaths).not.toContain('/3')
  expect(renderPaths).not.toContain('/category/first/3')
  expect(renderPaths).not.toContain('/tag/fourth-tag/3')
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

  expect(paths).toHaveLength(11)
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

async function _createApp (plugin) {
  const app = await new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(BOOTSTRAP_PAGES)
}
