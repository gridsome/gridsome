const App = require('../lib/app/App')
const { graphql } = require('../graphql')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')

let app, api

beforeEach(() => {
  app = new App(__dirname, {
    config: {
      plugins: []
    }
  }).init()

  api = new PluginAPI(app, {
    entry: { options: {}, clientOptions: undefined }
  })
})

afterAll(() => {
  app = null
  api = null
})

test('filter number by between', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { price: { between: [120, 150] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('filter number by gt', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { price: { gt: 120 } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter list by contains', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { contains: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
})

test('filter list by containsAny', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { containsAny: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(3)
})

test('filter list by containsNone', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { tags: { containsNone: ["one", "four"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
})

test('filter list by regex', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { title: { regex: "Do[l|j]or" } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
})

test('filter list by boolean', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { featured: { eq: true } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

async function createSchemaAndExecute (query) {
  const posts = api.store.addContentType({ typeName: 'Product' })

  posts.addNode({
    id: '1',
    date: '2017-10-08',
    title: 'Cursus Ridiculus Dolor Justo',
    fields: {
      price: 99,
      featured: false,
      tags: ['one', 'two', 'four']
    }
  })

  posts.addNode({
    id: '2',
    date: '2018-03-28',
    title: 'Dojor Inceptos Venenatis Nibh',
    fields: {
      price: 199,
      featured: false,
      tags: ['two']
    }
  })

  posts.addNode({
    id: '3',
    date: '2018-07-14',
    title: 'Bibendum Ornare Pharetra',
    fields: {
      price: 149,
      featured: true,
      tags: ['three', 'four']
    }
  })

  posts.addNode({
    id: '4',
    date: '2018-12-20',
    title: 'Vestibulum Aenean Bibendum Euismod',
    fields: {
      price: 119,
      featured: false,
      tags: ['one', 'two']
    }
  })

  const schema = createSchema(app.store)
  const context = app.createSchemaContext()

  return graphql(schema, query, undefined, context)
}
