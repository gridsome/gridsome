const path = require('path')
const App = require('../lib/app/App')
const { graphql } = require('../graphql')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')

const context = __dirname
const imagesDir = path.join(context, 'assets', 'static')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

let app, api

beforeEach(() => {
  app = new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      imagesDir,
      filesDir,
      outDir: context,
      imageExtensions: ['.png'],
      maxImageWidth: 1000
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

test('create node reference', async () => {
  const authors = api.store.addContentType({
    typeName: 'Author'
  })

  const posts = api.store.addContentType({
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

  posts.addNode({
    id: '1',
    fields: {
      author: { typeName: 'Author', id: '2' },
      user: { typeName: 'Author', id: '2' }
    }
  })

  posts.addNode({
    id: '2',
    fields: {
      authorRef: '2'
    }
  })

  const query = `query {
    author (id: "2") {
      belongsTo {
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

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
