const App = require('../../../app/App')
const { graphql } = require('graphql')
const PluginAPI = require('../../../app/PluginAPI')
const createSchema = require('../../createSchema')

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
  const authors = api.store.addContentType({
    typeName: 'Author'
  })

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
    fields: {
      related: { typeName: 'Author', id: '2' }
    }
  })

  books.addNode({
    id: '1',
    title: 'Post A',
    fields: {
      author: { typeName: 'Author', id: '2' },
      user: { typeName: 'Author', id: '2' }
    }
  })

  books.addNode({
    id: '2',
    title: 'Post B',
    fields: {
      authorRef: '2'
    }
  })

  const query = `query {
    author (id: "2") {
      belongsTo (sortBy: "title") {
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
  expect(data.author.belongsTo.edges[0].node.id).toEqual('2')
  expect(data.author.belongsTo.edges[0].node.__typename).toEqual('Book')
  expect(data.author.belongsTo.edges[1].node.id).toEqual('1')
  expect(data.author.belongsTo.edges[1].node.__typename).toEqual('Book')
  expect(data.author.belongsTo.edges[2].node.__typename).toEqual('Author')
})

test('handle pagination for filtered belongsTo', async () => {
  const authors = api.store.addContentType({ typeName: 'Author' })
  const books = api.store.addContentType({ typeName: 'Book' })
  const stores = api.store.addContentType({ typeName: 'Store' })

  authors.addNode({ id: '1', title: 'Author 1' })

  for (let i = 1; i <= 10; i++) {
    books.addNode({ id: String(i), fields: { author: { typeName: 'Author', id: '1' }}})
  }

  for (let i = 1; i <= 10; i++) {
    stores.addNode({ id: String(i), fields: { author: { typeName: 'Author', id: '1' }}})
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
