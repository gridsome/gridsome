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
    typeName: 'TestAuthor'
  })

  const posts = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authors.addNode({
    id: '2',
    title: 'Test Author'
  })

  posts.addNode({
    id: '1',
    fields: {
      author: '2',
      customRefs: {
        author: {
          typeName: 'TestAuthor',
          id: '2'
        }
      }
    }
  })

  const query = `{
    testAuthor (id: "2") {
      edges {
        ...on TestPost {
          id
        }
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.testAuthor.edges).toHaveLength(1)
  expect(data.testAuthor.edges[0].id).toEqual('1')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
