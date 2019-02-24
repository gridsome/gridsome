const path = require('path')
const createApp = require('../app')
const { createRenderQueue } = require('../build')
const { BOOTSTRAP_ROUTES } = require('../utils/constants')

test('create render queue for basic project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-basic')
  const app = await createApp(context, undefined, BOOTSTRAP_ROUTES)
  const queue = await createRenderQueue(app)

  const renderPaths = queue.map(page => page.path)
  const htmlOutputs = queue.map(page => page.htmlOutput)
  const dataOutputs = queue.map(page => page.dataOutput)

  expect(renderPaths[0]).toEqual('/')
  expect(htmlOutputs).toContain(path.join(app.config.outDir, 'index.html'))
  expect(dataOutputs).toContain(path.join(app.config.cacheDir, 'data', 'index.json'))

  expect(renderPaths[renderPaths.length - 1]).toEqual('/404')
  expect(htmlOutputs).toContain(path.join(app.config.outDir, '404.html'))
  expect(dataOutputs).toContain(path.join(app.config.cacheDir, 'data', '404.json'))

  expect(renderPaths).toContain('/category/first')
  expect(renderPaths).toContain('/category/first/2')
  expect(renderPaths).not.toContain('/category/first/3')
  expect(renderPaths).toContain('/blog')
  expect(renderPaths).toContain('/blog/2')
  expect(renderPaths).not.toContain('/blog/3')

  for (let i = 4; i <= 13; i++) {
    expect(renderPaths).toContain(`/blog/post-${i}`)
  }
})

test('create render queue for blog project', async () => {
  const context = path.join(__dirname, '__fixtures__', 'project-blog')
  const app = await createApp(context, undefined, BOOTSTRAP_ROUTES)
  const queue = await createRenderQueue(app)

  const renderPaths = queue.map(page => page.path)

  expect(renderPaths).toContain('/')
  expect(renderPaths).not.toContain('/1')

  for (let i = 2; i <= 5; i++) {
    expect(renderPaths).toContain(`/${i}`)
  }

  for (let i = 1; i <= 50; i++) {
    expect(renderPaths).toContain(`/post-${i}`)
  }
})
