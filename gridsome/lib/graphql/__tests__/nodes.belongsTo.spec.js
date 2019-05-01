const App = require('../../app/App')
const { graphql } = require('graphql')
const PluginAPI = require('../../app/PluginAPI')
const createSchema = require('../createSchema')

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

test('create node reference', async () => {
  const authors = api.store.addContentType('Author')

  const books = api.store.addContentType({
    typeName: 'Book',
    refs: {
      authorRef: {
        typeName: 'Author'
      }
    }
  })

  authors.addNode({ id: '1', title: 'Author 1' })
  authors.addNode({ id: '2', title: 'Author 2' })

  authors.addNode({
    id: '3',
    title: 'Author 3',
    related: { typeName: 'Author', id: '2' }
  })

  books.addNode({
    id: '1',
    title: 'Post A',
    author: { typeName: 'Author', id: '2' },
    user: { typeName: 'Author', id: '2' }
  })

  books.addNode({
    id: '2',
    title: 'Post B',
    authorRef: '2'
  })

  const query = `query {
    author (id: "2") {
      belongsTo (sortBy: "title", order: ASC) {
        totalCount
        pageInfo {
          totalPages
        }
        edges {
          node {
            __typename
            ...on Book {
              id
            }
          }
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.author.belongsTo.edges).toHaveLength(3)
  expect(data.author.belongsTo.totalCount).toEqual(3)
  expect(data.author.belongsTo.pageInfo.totalPages).toEqual(1)
  expect(data.author.belongsTo.edges[0].node.__typename).toEqual('Author')
  expect(data.author.belongsTo.edges[1].node.id).toEqual('1')
  expect(data.author.belongsTo.edges[1].node.__typename).toEqual('Book')
  expect(data.author.belongsTo.edges[2].node.id).toEqual('2')
  expect(data.author.belongsTo.edges[2].node.__typename).toEqual('Book')
})

test('sort belongsTo by multiple fields', async () => {
  const authors = api.store.addContentType('Author')
  const books = api.store.addContentType('Book')
  books.addReference('author', 'Author')

  authors.addNode({ id: '1', title: 'Author 1' })
  books.addNode({ id: '1', title: 'A', author: '1', featured: false })
  books.addNode({ id: '2', title: 'B', author: '1', featured: true })
  books.addNode({ id: '3', title: 'C', author: '1', featured: false })

  const query = `query {
    author (id: "1") {
      belongsTo (sort: [{ by: "featured" }, { by: "title", order: ASC }]) {
        edges {
          node {
            ...on Book {
              id
            }
          }
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.author.belongsTo.edges[0].node.id).toEqual('2')
  expect(data.author.belongsTo.edges[1].node.id).toEqual('1')
  expect(data.author.belongsTo.edges[2].node.id).toEqual('3')
})

test('handle pagination for filtered belongsTo', async () => {
  const authors = api.store.addContentType('Author')
  const stores = api.store.addContentType('Store')
  const books = api.store.addContentType('Book')

  authors.addNode({ id: '1', title: 'Author 1' })

  for (let i = 1; i <= 10; i++) {
    books.addNode({ id: String(i), author: { typeName: 'Author', id: '1' }})
  }

  for (let i = 1; i <= 10; i++) {
    stores.addNode({ id: String(i), author: { typeName: 'Author', id: '1' }})
  }

  const query = `query {
    author (id: "1") {
      belongsTo (perPage: 3, filter: { typeName: { eq: Book }}) {
        totalCount
        pageInfo {
          totalPages
        }
        edges {
          node {
            __typename
          }
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.author.belongsTo.edges).toHaveLength(3)
  expect(data.author.belongsTo.totalCount).toEqual(10)
  expect(data.author.belongsTo.pageInfo.totalPages).toEqual(1)
  expect(data.author.belongsTo.edges[0].node.__typename).toEqual('Book')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
