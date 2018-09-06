const Store = require('../lib/utils/Store')
const Source = require('../lib/utils/Source')
const createSchema = require('../lib/graphql/createSchema')
const { inferTypes } = require('../lib/graphql/schema/infer-types')

const {
  graphql,
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} = require('../graphql')

let store, source

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
  store = new Store()
  source = new Source({ typeName: 'Test' }, { store, transformers })
})

afterAll(() => {
  store = null
  source = null
})

test('create node type with custom fields', async () => {
  source.addType('post')
  source.addNode('post', {
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
  source.addType('post')
  source.addNode('post', { _id: '1', path: '/test' })

  const query = '{ testPost (path: "/test") { _id }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost._id).toEqual('1')
})

test('fail if node with given ID is missing', async () => {
  source.addType('post')
  source.addNode('post', { _id: '1' })

  const query = '{ testPost (_id: "2") { _id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('A TestPost with id 2 was not found')
})

test('fail if node with given path is missing', async () => {
  source.addType('post')
  source.addNode('post', { path: '/test' })

  const query = '{ testPost (path: "/fail") { _id }}'
  const { errors } = await createSchemaAndExecute(query)

  expect(errors[0].message).toEqual('/fail was not found')
})

test('create connection', async () => {
  source.addType('post')
  source.addNode('post', { title: 'test 1', date: '2018-09-01T00:00:00.000Z' })
  source.addNode('post', { title: 'test 2', date: '2018-09-04T00:00:00.000Z' })

  const query = '{ allTestPost { totalCount edges { node { title }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.allTestPost.totalCount).toEqual(2)
  expect(data.allTestPost.edges[0].node.title).toEqual('test 2')
  expect(data.allTestPost.edges[1].node.title).toEqual('test 1')
})

test('get nodes by path regex', async () => {
  source.addType('post')
  source.addNode('post', { path: '/node-1' })
  source.addNode('post', { path: '/node-2' })
  source.addNode('post', { path: '/some-3' })

  const query = '{ allTestPost (regex: "/node") { edges { node { _id }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.allTestPost.edges.length).toEqual(2)
})

test('create node reference', async () => {
  source.addType('author')
  source.addType('post', {
    refs: {
      author: {
        type: 'author',
        key: '_id'
      }
    }
  })

  source.addNode('post', { _id: '1', fields: { author: '2' }})
  source.addNode('author', { _id: '2' })

  const query = '{ testPost (_id: "1") { refs { author { _id type }}}}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.refs.author[0]._id).toEqual('2')
  expect(data.testPost.refs.author[0].type).toEqual('author')
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

test('transformer extends node type', async () => {
  source.addType('post')
  source.addNode('post', {
    _id: '1',
    internal: {
      mimeType: 'application/json'
    }
  })

  const query = '{ testPost (_id: "1") { myField }}'
  const { data } = await createSchemaAndExecute(query)

  expect(data.testPost.myField).toEqual('value')
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(store)
  return graphql(schema, query, undefined, { store })
}
