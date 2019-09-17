const App = require('../../app/App')
const PluginAPI = require('../../app/PluginAPI')

let app, api

beforeEach(async () => {
  app = await new App(__dirname, {
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

test('filter by multiple ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { id: { in: ["2", "3"] } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
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

test('filter by deeply nested object', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { deep: { object: { eq: true } } }) {
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('2')
})

test('filter dates by between', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { between: ["2018-03-28", "2018-07-14"] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('filter dates by dteq', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { dteq: "2018-03-28" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('2')
})

test('filter dates by gt', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { date: { gt: "2018-03-28" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('4')
  expect(data.allProduct.edges[1].node.id).toEqual('3')
})

test('filter by reference id', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { related: { eq: "2" } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(1)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
})

test('filter by multiple reference ids', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (filter: { alternatives: { containsAny: ["1", "4"] } }) {
      edges {
        node { id }
      }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.edges[0].node.id).toEqual('3')
  expect(data.allProduct.edges[1].node.id).toEqual('2')
})

test('handle pagination for filtered nodes', async () => {
  const { errors, data } = await createSchemaAndExecute(`{
    allProduct (perPage: 2, filter: { title: { regex: "Do[l|j]or" } }) {
      totalCount
      pageInfo {
       totalPages
      }
      edges { node { id } }
    }
  }`)

  expect(errors).toBeUndefined()
  expect(data.allProduct.edges).toHaveLength(2)
  expect(data.allProduct.totalCount).toEqual(2)
  expect(data.allProduct.pageInfo.totalPages).toEqual(1)
})

function createSchemaAndExecute (query) {
  const posts = api.store.addCollection('Product')

  posts.addNode({
    id: '1',
    date: '2017-10-08',
    title: 'Cursus Ridiculus Dolor Justo',
    price: 99,
    featured: false,
    tags: ['one', 'two', 'four'],
    alternatives: [
      { typeName: 'Product', id: '2' }
    ]
  })

  posts.addNode({
    id: '2',
    date: '2018-03-28',
    title: 'Dojor Inceptos Venenatis Nibh',
    price: 199,
    featured: false,
    tags: ['two'],
    deep: {
      object: true
    },
    alternatives: [
      { typeName: 'Product', id: '1' },
      { typeName: 'Product', id: '3' }
    ]
  })

  posts.addNode({
    id: '3',
    date: '2018-07-14',
    title: 'Bibendum Ornare Pharetra',
    price: 149,
    featured: true,
    tags: ['three', 'four'],
    related: {
      typeName: 'Product',
      id: '2'
    },
    alternatives: [
      { typeName: 'Product', id: '4' }
    ]
  })

  posts.addNode({
    id: '4',
    date: '2018-12-20',
    title: 'Vestibulum Aenean Bibendum Euismod',
    price: 119,
    featured: false,
    tags: ['one', 'two'],
    alternatives: [
      { typeName: 'Product', id: '2' },
      { typeName: 'Product', id: '3' }
    ]
  })

  return app.schema.buildSchema().runQuery(query)
}
