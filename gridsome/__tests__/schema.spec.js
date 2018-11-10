const path = require('path')
const App = require('../lib/app/App')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')
const { inferTypes } = require('../lib/graphql/schema/infer-types')
const { GraphQLDate } = require('../lib/graphql/schema/types/date')
const { fileType } = require('../lib/graphql/schema/types/file')
const { imageType } = require('../lib/graphql/schema/types/image')
const JSONTransformer = require('./__fixtures__/JSONTransformer')

const context = __dirname
const targetDir = path.join(context, 'assets', 'static')
const assetsDir = path.join(targetDir, 'assets')
const pathPrefix = '/'

const {
  graphql,
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} = require('../graphql')

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

  const query = '{ testPost (id: "1") { id _id foo list obj { foo }}}'
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

  postContentType.addNode({ id: '1', fields: { author: '2' }})
  authorContentType.addNode({ id: '2', title: 'Test Author' })

  const query = '{ testPost (id: "1") { author { id title }}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.author.id).toEqual('2')
  expect(data.testPost.author.title).toEqual('Test Author')
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

  postContentType.addNode({ id: '1', fields: { author: ['2'] }})
  authorContentType.addNode({ id: '2', title: 'Test Author' })

  const query = '{ testPost (id: "1") { refs { author { id title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.author[0].id).toEqual('2')
  expect(data.testPost.refs.author[0].title).toEqual('Test Author')
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

test('infer types from node fields', () => {
  const types = inferTypes([
    {
      fields: {
        string: 'bar',
        number: 10,
        float: 1.2,
        truthyBoolean: true,
        stringList: ['item'],
        numberList: [10],
        floatList: [1.2],

        obj: {
          foo: 'bar'
        }
      }
    },
    {
      fields: {
        string: null,
        falsyBoolean: false,
        booleanList: [false],
        emptyList: [],
        emptyObj: {},
        emptyString: ''
      }
    }
  ], 'TestPost')

  expect(types.string.type).toEqual(GraphQLString)
  expect(types.number.type).toEqual(GraphQLInt)
  expect(types.float.type).toEqual(GraphQLFloat)
  expect(types.falsyBoolean.type).toEqual(GraphQLBoolean)
  expect(types.truthyBoolean.type).toEqual(GraphQLBoolean)
  expect(types.stringList.type).toBeInstanceOf(GraphQLList)
  expect(types.stringList.type.ofType).toEqual(GraphQLString)
  expect(types.numberList.type.ofType).toEqual(GraphQLInt)
  expect(types.floatList.type.ofType).toEqual(GraphQLFloat)
  expect(types.booleanList.type.ofType).toEqual(GraphQLBoolean)
  expect(types.obj.type).toBeInstanceOf(GraphQLObjectType)
  expect(types.obj.type.name).toEqual('TestPostObj')
  expect(types.obj.type.getFields().foo.type).toEqual(GraphQLString)
  expect(types.emptyList).toBeUndefined()
  expect(types.emptyObj).toBeUndefined()
  expect(types.emptyString).toBeUndefined()
})

test('infer date fields', () => {
  const types = inferTypes([
    {
      fields: {
        date1: '2018',
        date2: '2018-11',
        date3: '2018-11-01',
        date4: '2018-11-01T19:20+01:00',
        date5: '2018-11-01T19:20:30+01:00'
      }
    },
  ], 'TestPost')

  expect(types.date1.type).toEqual(GraphQLDate)
  expect(types.date2.type).toEqual(GraphQLDate)
  expect(types.date3.type).toEqual(GraphQLDate)
  expect(types.date4.type).toEqual(GraphQLDate)
  expect(types.date5.type).toEqual(GraphQLDate)
})

test('infer image fields', () => {
  const types = inferTypes([
    {
      fields: {
        image1: 'image.png',
        image2: '/image.png',
        image3: './image.png',
        image4: 'https://www.example.com/images/image.png'
      }
    },
  ], 'TestPost')

  expect(types.image1.type).toEqual(imageType.type)
  expect(types.image2.type).toEqual(imageType.type)
  expect(types.image3.type).toEqual(imageType.type)
  expect(types.image4.type).toEqual(imageType.type)
})

test('infer file fields', () => {
  const types = inferTypes([
    {
      fields: {
        file1: './document.pdf',
        file2: 'https://www.example.com/files/document.pdf'
      }
    },
  ], 'TestPost')

  expect(types.file1.type).toEqual(fileType.type)
  expect(types.file2.type).toEqual(fileType.type)
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
        image3: './350x250.png'
      })
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      image
      image2
      image3
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
        file3: './dummy.pdf'
      })
    }
  })

  const { data } = await createSchemaAndExecute(`{
    testPost (id: "1") {
      file
      file2
      file3
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
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
