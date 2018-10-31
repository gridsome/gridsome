const App = require('../lib/app/App')
const PluginAPI = require('../lib/app/PluginAPI')
const createSchema = require('../lib/graphql/createSchema')
const { inferTypes } = require('../lib/graphql/schema/infer-types')
const { GraphQLDate } = require('../lib/graphql/schema/types/date')

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

const transformers = {
  'application/json': {
    extendNodeType () {
      return {
        myField: {
          type: GraphQLString,
          resolve: () => 'value'
        }
      }
    }
  }
}

beforeEach(() => {
  app = new App('/', { config: { plugins: [] }})
  app.init()
  api = new PluginAPI(app, { options: {}, transformers })
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

  contentType.addNode({ _id: '1', path: '/test' })

  const query = '{ testPost (path: "/test") { _id }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost._id).toEqual('1')
})

test('fail if node with given ID is missing', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({ _id: '1' })

  const query = '{ testPost (_id: "2") { _id }}'
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
        key: '_id',
        typeName: 'TestAuthor'
      }
    }
  })

  postContentType.addNode({ _id: '1', fields: { author: ['2'] }})
  authorContentType.addNode({ _id: '2', title: 'Test Author' })

  const query = '{ testPost (_id: "1") { refs { author { _id title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.author[0]._id).toEqual('2')
  expect(data.testPost.refs.author[0].title).toEqual('Test Author')
})

test('create node reference to same type', async () => {
  const postContentType = api.store.addContentType({
    typeName: 'TestPost',
    refs: {
      related: {
        key: '_id'
      }
    }
  })

  postContentType.addNode({ _id: '1', fields: { related: '2' }})
  postContentType.addNode({ _id: '2', title: 'Test' })

  const query = '{ testPost (_id: "1") { refs { related { _id title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.related._id).toEqual('2')
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
        emptyObj: {}
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

test('transformer extends node type', async () => {
  const contentType = api.store.addContentType({
    typeName: 'TestPost'
  })

  contentType.addNode({
    _id: '1',
    internal: {
      mimeType: 'application/json',
      content: ''
    }
  })

  const query = '{ testPost (_id: "1") { myField }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.myField).toEqual('value')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  return graphql(schema, query, undefined, { store: app.store })
}
