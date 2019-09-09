const App = require('../../app/App')

test('get page by path', async () => {
  const { errors, data } = await runQuery(`
    query {
      page(path:"/page-one") {
        path
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.page.path).toEqual('/page-one/')
})

test('filter pages by path', async () => {
  const { errors, data } = await runQuery(`
    query {
      allPage(filter: { path: { regex: "two" }}) {
        path
      }
    }
  `)

  expect(errors).toBeUndefined()
  expect(data.allPage).toHaveLength(1)
  expect(data.allPage[0].path).toEqual('/page-two/')
})

async function runQuery (query) {
  const app = await new App(__dirname).init()

  app.pages.createPage({
    path: '/page-one',
    component: './__fixtures__/Page.vue',
    context: {
      foo: 'bar'
    }
  })

  app.pages.createPage({
    path: '/page-two',
    component: './__fixtures__/Page.vue'
  })

  return app.schema.buildSchema().runQuery(query)
}
