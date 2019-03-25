const path = require('path')
const createApp = require('../app')
const { createRenderQueue } = require('../app/pages')
const { BOOTSTRAP_PAGES } = require('../utils/constants')

test('create render queue for basic project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-basic')
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
  const context = path.join(__dirname, '__fixtures__', 'project-blog')
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
