const path = require('path')
const App = require('../App')
const { STATIC_ROUTE } = require('../../utils/constants')

test('add page', () => {
  const { app, api } = createApi()
  const component = path.join(__dirname, '__fixtures__', 'Page.vue')

  api.pages.addPage({
    path: '/page',
    component
  })

  expect(app.pages._pages).toHaveLength(1)
  expect(app.pages._pages[0].name).toBeUndefined()
  expect(app.pages._pages[0].path).toEqual('/page')
  expect(app.pages._pages[0].component).toEqual(component)
  expect(app.pages._pages[0].pageQuery).toMatchObject({ query: null, paginate: false })
  expect(app.pages._pages[0].context).toEqual({})

  expect(app.pages._pages[0].route.type).toEqual(STATIC_ROUTE)
  expect(app.pages._pages[0].route.name).toEqual('page')
  expect(app.pages._pages[0].route.path).toEqual('/page')
  expect(app.pages._pages[0].route.originalPath).toEqual('/page')
  expect(app.pages._pages[0].route.component).toEqual(component)
  expect(app.pages._pages[0].route.isIndex).toEqual(true)
  expect(app.pages._pages[0].route.chunkName).toBeUndefined()
  expect(app.pages._pages[0].route.renderQueue).toHaveLength(0)
})

test('add page with context', () => {
  const { app, api } = createApi()

  api.pages.addPage({
    path: '/page',
    component: path.join(__dirname, '__fixtures__', 'Page.vue'),
    context: {
      id: '1'
    }
  })

  expect(app.pages._pages[0].context).toMatchObject({ id: '1' })
})

test('remove page', () => {
  const { app, api } = createApi()

  api.pages.addPage({
    path: '/page',
    component: path.join(__dirname, '__fixtures__', 'Page.vue')
  })

  api.pages.removePage('/page')

  expect(app.pages._pages).toHaveLength(0)
})

function createApi (context = '/') {
  const app = new App(context).init()
  return { app, api: app.plugins[0].api }
}
