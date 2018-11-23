const path = require('path')
const App = require('../lib/app/App')
const { graphql } = require('../graphql')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

const context = __dirname
const targetDir = path.join(context, 'assets', 'static')
const assetsDir = path.join(targetDir, 'assets')
const pathPrefix = '/'

let app, api

beforeEach(() => {
  app = new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      targetDir,
      assetsDir,
      imageExtensions: ['.png'],
      maxImageWidth: 1000
    }
  }).init()

  api = new PluginAPI(app, {
    entry: { options: {}, clientOptions: undefined },
    transformers: {
      'application/json': {
        TransformerClass: JSONTransformer,
        options: {},
        name: 'json'
      }
    }
  })
})

afterAll(() => {
  app = null
  api = null
})

test('create node type with custom fields', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  contentType.addNode({
    id: '2',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  const query = '{ testPost (id: "1") { id foo list obj { foo }}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.id).toEqual('1')
  expect(data.testPost.foo).toEqual('bar')
  expect(data.testPost.list[0]).toEqual('item')
  expect(data.testPost.obj.foo).toEqual('bar')
})

// TODO: remove test before 1.0
test('get deprecated node fields', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    _id: '1',
    fields: {
      foo: 'bar',
      list: ['item'],
      obj: {
        foo: 'bar'
      }
    }
  })

  const query = '{ testPost (_id: "1") { _id fields { foo list obj { foo } }}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost._id).toEqual('1')
  expect(data.testPost.fields.foo).toEqual('bar')
  expect(data.testPost.fields.list[0]).toEqual('item')
  expect(data.testPost.fields.obj.foo).toEqual('bar')
})

test('get node by path', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ id: '1', path: '/test' })

  const query = '{ testPost (path: "/test") { id }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.id).toEqual('1')
})

test('fail if node with given ID is missing', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ id: '1' })

  const query = '{ testPost (id: "2") { id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('A TestPost with id 2 was not found')
})

test('fail if node with given path is missing', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode('post', { path: '/test' })

  const query = '{ testPost (path: "/fail") { _id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('/fail was not found')
})

test('create connection', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ title: 'test 1', date: '2018-09-01T00:00:00.000Z' })
  contentType.addNode({ title: 'test 2', date: '2018-09-04T00:00:00.000Z' })

  const query = '{ allTestPost { totalCount edges { node { title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.allTestPost.totalCount).toEqual(2)
  expect(data.allTestPost.edges[0].node.title).toEqual('test 2')
  expect(data.allTestPost.edges[1].node.title).toEqual('test 1')
})

test('get nodes by path regex', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ path: '/node-1' })
  contentType.addNode({ path: '/node-2' })
  contentType.addNode({ path: '/some-3' })

  const query = '{ allTestPost (regex: "/node") { edges { node { _id }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.allTestPost.edges.length).toEqual(2)
})

test('create node reference', async () => {
  const authorContentType = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const postContentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authorContentType.addNode({
    id: '2',
    title: 'Test Author'
  })

  postContentType.addNode({
    id: '1',
    fields: {
      author: '2',
      customRefs: {
        author: {
          typeName: 'TestAuthor',
          value: '2'
        }
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      author { id title }
      customRefs {
        author { id title }
      }
    }
  }`

  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.author.id).toEqual('2')
  expect(data.testPost.author.title).toEqual('Test Author')
  expect(data.testPost.customRefs.author.id).toEqual('2')
  expect(data.testPost.customRefs.author.title).toEqual('Test Author')
})

// TODO: remove this test before 1.0
test('create deprecated node reference', async () => {
  const authorContentType = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const postContentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: '_id',
        typeName: 'TestAuthor'
      }
    }
  })

  postContentType.addNode({ _id: '1', fields: { author: '2' }})
  authorContentType.addNode({ _id: '2', title: 'Test Author' })

  const query = '{ testPost (_id: "1") { refs { author { _id title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.author._id).toEqual('2')
  expect(data.testPost.refs.author.title).toEqual('Test Author')
})

test('create node list reference', async () => {
  const authorContentType = api.store.addContentType({
    typeName: 'TestAuthor'
  })

  const postContentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      author: {
        key: 'id',
        typeName: 'TestAuthor'
      }
    }
  })

  authorContentType.addNode({
    id: '2',
    title: 'Test Author'
  })

  postContentType.addNode({
    id: '1',
    fields: {
      author: ['2'],
      customRefs: {
        author: {
          typeName: 'TestAuthor',
          value: ['2']
        }
      }
    }
  })

  const query = `{
    testPost (id: "1") {
      author { id title }
      customRefs {
        author { id title }
      }
    }
  }`

  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.author[0].id).toEqual('2')
  expect(data.testPost.author[0].title).toEqual('Test Author')
  expect(data.testPost.customRefs.author[0].id).toEqual('2')
  expect(data.testPost.customRefs.author[0].title).toEqual('Test Author')
})

test('create node reference to same type', async () => {
  const postContentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      related: {
        key: 'id'
      }
    }
  })

  postContentType.addNode({ id: '1', fields: { related: '2' }})
  postContentType.addNode({ id: '2', title: 'Test' })

  const query = '{ testPost (id: "1") { refs { related { id title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.related.id).toEqual('2')
  expect(data.testPost.refs.related.title).toEqual('Test')
})

test('should get values from object fields', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    fields: {
      myObject: {
        value: 'test1',
        otherObject: {
          value: 'test2'
        }
      }
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      myObject {
        value
        otherObject {
          value
        }
      }
    }
  }`)

  expect(data.testPost.myObject.value).toEqual('test1')
  expect(data.testPost.myObject.otherObject.value).toEqual('test2')
})

test('should format dates from schema', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPostDate'
  })

  contentType.addNode({
    id: '1',
    date: '2018-10-10',
    fields: {
      customDate: '2018-10-10',
      dateObject: {
        date: '2018-10-10'
      }
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPostDate (id: "1") {
      date
      customDate
      date2: date(format: "YYYY-MM-DD")
      date3: customDate(format: "DD/MM/YYYY")
      dateObject {
        date(format: "DD/MM/YYYY")
      }
    }
  }`)

  expect(data.testPostDate.date).toEqual('2018-10-10T00:00:00+02:00')
  expect(data.testPostDate.customDate).toEqual('2018-10-10T00:00:00+02:00')
  expect(data.testPostDate.date2).toEqual('2018-10-10')
  expect(data.testPostDate.date3).toEqual('10/10/2018')
  expect(data.testPostDate.dateObject.date).toEqual('10/10/2018')
})

test('transformer extends node type', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      content: ''
    }
  })

  const query = '{ testPost (id: "1") { myField }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.myField).toEqual('value')
})

test('transformer should resolve absolute paths', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost',
    resolveAbsolutePaths: true
  })

  contentType.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({})
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      fileField
    }
  }`)

  expect(data.testPost.fileField).toEqual(`${context}/assets/image.png`)
})

test('process image types in schema', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({
        image: '/assets/350x250.png',
        image2: 'https://www.example.com/images/image.png',
        image3: './350x250.png',
        image4: './1000x600.png'
      })
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      image
      image2
      image3
      image4 (width: 300, quality: 100, blur: 0)
    }
  }`)

  expect(data.testPost.image.type).toEqual('image')
  expect(data.testPost.image.mimeType).toEqual('image/png')
  expect(data.testPost.image.src).toEqual('/assets/350x250.png')
  expect(data.testPost.image.size).toBeUndefined()
  expect(data.testPost.image.sizes).toBeUndefined()
  expect(data.testPost.image.srcset).toBeUndefined()
  expect(data.testPost.image.dataUri).toBeUndefined()
  expect(data.testPost.image2.type).toEqual('image')
  expect(data.testPost.image2.mimeType).toEqual('image/png')
  expect(data.testPost.image2.src).toEqual('https://www.example.com/images/image.png')
  expect(data.testPost.image3.type).toEqual('image')
  expect(data.testPost.image3.mimeType).toEqual('image/png')
  expect(data.testPost.image3.src).toEqual('/assets/static/350x250-w350.test.png')
  expect(data.testPost.image3.size).toMatchObject({ width: 350, height: 250 })
  expect(data.testPost.image3.sizes).toEqual('(max-width: 350px) 100vw, 350px')
  expect(data.testPost.image3.srcset).toHaveLength(1)
  expect(data.testPost.image3.dataUri).toMatch(/data:image\/png/g)
  expect(data.testPost.image4.src).toEqual('/assets/static/1000x600-w300-q100.test.png')
  expect(data.testPost.image4.size).toMatchObject({ width: 300, height: 180 })
  expect(data.testPost.image4.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(data.testPost.image4.srcset).toHaveLength(1)
})

test('process file types in schema', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    id: '1',
    internal: {
      mimeType: 'application/json',
      origin: `${context}/assets/file.md`,
      content: JSON.stringify({
        file: '/assets/document.pdf',
        file2: 'https://www.example.com/assets/document.pdf',
        file3: './dummy.pdf',
        url: 'https://www.gridsome.org',
        url2: 'https://www.gridsome.com',
        text: 'pdf'
      })
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      file
      file2
      file3
      url
      url2
      text
    }
  }`)

  expect(data.testPost.file.type).toEqual('file')
  expect(data.testPost.file.mimeType).toEqual('application/pdf')
  expect(data.testPost.file.src).toEqual('/assets/document.pdf')
  expect(data.testPost.file2.type).toEqual('file')
  expect(data.testPost.file2.mimeType).toEqual('application/pdf')
  expect(data.testPost.file2.src).toEqual('https://www.example.com/assets/document.pdf')
  expect(data.testPost.file3.type).toEqual('file')
  expect(data.testPost.file3.mimeType).toEqual('application/pdf')
  expect(data.testPost.file3.src).toEqual('/assets/files/dummy.pdf')
  expect(data.testPost.url).toEqual('https://www.gridsome.org')
  expect(data.testPost.url2).toEqual('https://www.gridsome.com')
  expect(data.testPost.text).toEqual('pdf')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
