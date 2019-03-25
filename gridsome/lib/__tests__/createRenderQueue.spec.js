const path = require('path')
const createApp = require('../app')
const { createRenderQueue } = require('../app/pages')
const { BOOTSTRAP_CODE } = require('../utils/constants')

test('create render queue for basic project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-basic')
  const app = await createApp(context, undefined, BOOTSTRAP_CODE)
  const queue = createRenderQueue([], app)

  const renderPaths = queue.map(entry => entry.path)

  expect(renderPaths).toHaveLength(16)
  expect(renderPaths).toContain('/')
  expect(renderPaths).toContain('/404')
})

test('create render queue for blog project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-blog')
  const app = await createApp(context, undefined, BOOTSTRAP_CODE)
  const queue = createRenderQueue([], app)

  const renderPaths = queue.map(entry => entry.path)

  expect(renderPaths).toContain('/')
  expect(renderPaths).toContain('/2')
  expect(renderPaths).not.toContain('/3')
  expect(renderPaths).toContain('/category/first')
  expect(renderPaths).toContain('/category/first/2')
  expect(renderPaths).not.toContain('/category/first/3')
  expect(renderPaths).toContain('/first-post')
  expect(renderPaths).toContain('/second-post')
  expect(renderPaths).toContain('/third-post')
  expect(renderPaths).toContain('/tag/first-tag')
  expect(renderPaths).toContain('/tag/second-tag')
  expect(renderPaths).toContain('/tag/third-tag')
  expect(renderPaths).toContain('/tag/fourth-tag')
  expect(renderPaths).toContain('/tag/fourth-tag/2')
  expect(renderPaths).not.toContain('/tag/fourth-tag/3')

  for (let i = 4; i <= 13; i++) {
    expect(renderPaths).toContain(`/post-${i}`)
  }
})
