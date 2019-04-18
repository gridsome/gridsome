const { GraphQLFile } = require('../types/file')
const { GraphQLDate } = require('../types/date')
const { GraphQLImage } = require('../types/image')
const { createFieldTypes } = require('../createFieldTypes')
const createFieldDefinitions = require('../createFieldDefinitions')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} = require('../graphql')

const nodes = [
  {
    fields: {
      string: 'bar',
      number: 10,
      float: 1.2,
      nullValue: null,
      truthyBoolean: true,
      stringList: ['item'],
      numberList: [10],
      floatList: [1.2],
      objList: [
        { a: 'a' },
        { b: 'b' } // #184
      ],
      extendObj: {},
      refs: [],
      refList: [
        { typeName: 'Post1', id: '1' },
        { typeName: 'Post2', id: '1' },
        { typeName: 'Post3', id: '1' }
      ],
      simpleObj: {
        foo: 'bar'
      },
      obj: {
        foo: 'bar'
      }
    }
  },
  {
    fields: {
      string: true,
      falsyBoolean: false,
      booleanList: [false],
      numberList: [5, 30],
      emptyList: [],
      objList: [
        { c: 'c' }
      ],
      emptyObj: {},
      emptyString: '',
      refs: [
        { typeName: 'Post', id: '1' } // #128, #129
      ],
      ref: { typeName: 'Post', id: '1' },
      extendObj: {
        bar: 'foo'
      },
      obj: {
        bar: 'foo',
        test: {
          foo: 'bar'
        }
      }
    }
  },
  {
    fields: {
      ref: null,
      refs: [],
      objList: [],
      numberList: []
    }
  }
]

test('merge node fields', () => {
  const fields = createFieldDefinitions(nodes)

  expect(fields.emptyString).toEqual('')
  expect(fields.numberList).toHaveLength(1)
  expect(fields.floatList).toHaveLength(1)
  expect(fields.objList).toHaveLength(1)
  expect(fields.emptyList).toHaveLength(0)
  expect(fields.objList[0]).toMatchObject({ a: 'a', b: 'b', c: 'c' })
  expect(fields.refs.typeName).toHaveLength(1)
  expect(fields.refs.typeName[0]).toEqual('Post')
  expect(fields.refs.isList).toEqual(true)
  expect(fields.refList.typeName).toHaveLength(3)
  expect(fields.refList.typeName).toEqual(expect.arrayContaining(['Post1', 'Post2', 'Post3']))
  expect(fields.refList.isList).toEqual(true)
  expect(fields.ref).toMatchObject({ typeName: 'Post', isList: false })
  expect(fields.emptyObj).toMatchObject({})
  expect(fields.simpleObj).toMatchObject({ foo: 'bar' })
  expect(fields.extendObj).toMatchObject({ bar: 'foo' })
  expect(fields.obj).toMatchObject({ foo: 'bar', bar: 'foo', test: { foo: 'bar' }})
})

test('create graphql types from node fields', () => {
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(fields, 'TestPost', {})

  expect(types.string.type).toEqual(GraphQLString)
  expect(types.number.type).toEqual(GraphQLInt)
  expect(types.float.type).toEqual(GraphQLFloat)
  expect(types.emptyString.type).toEqual(GraphQLString)
  expect(types.falsyBoolean.type).toEqual(GraphQLBoolean)
  expect(types.truthyBoolean.type).toEqual(GraphQLBoolean)
  expect(types.stringList.type).toBeInstanceOf(GraphQLList)
  expect(types.stringList.type.ofType).toEqual(GraphQLString)
  expect(types.numberList.type.ofType).toEqual(GraphQLInt)
  expect(types.floatList.type.ofType).toEqual(GraphQLFloat)
  expect(types.booleanList.type.ofType).toEqual(GraphQLBoolean)
  expect(types.extendObj.type.getFields().bar.type).toEqual(GraphQLString)
  expect(types.simpleObj.type).toBeInstanceOf(GraphQLObjectType)
  expect(types.obj.type).toBeInstanceOf(GraphQLObjectType)
  expect(types.obj.type.name).toEqual('TestPostObj')
  expect(types.obj.type.getFields().foo.type).toEqual(GraphQLString)
  expect(types.obj.type.getFields().bar.type).toEqual(GraphQLString)
  expect(types.obj.type.getFields().test.type).toBeInstanceOf(GraphQLObjectType)
  expect(types.nullValue).toBeUndefined()
  expect(types.emptyList).toBeUndefined()
  expect(types.emptyObj).toBeUndefined()
})

test.each([
  ['number first', [{ number: 1 }, { number: 1.2 }, { number: 2 }]],
  ['float first', [{ number: 1.2 }, { number: 1 }, { number: 2 }]],
  ['missing number 1', [{ number: 1 }, {}, { number: 1.2 }]],
  ['missing number 2', [{ number: 1.2 }, {}, { number: 1 }]],
  ['mixed type', [{ number: 1.2 }, { number: true }, { number: 'string' }]]
])('prefer float when mixed number types - %s', (_, nodeFields) => {
  const nodes = nodeFields.map(fields => ({ fields }))
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(fields, 'Test')

  expect(types.number.type).toEqual(GraphQLFloat)
})

test.each([
  ['number first', [{ numbers: [1, 1.5, 2] }]],
  ['float first', [{ numbers: [1.5, 1] }]],
  ['empty list', [{ numbers: [] }, { numbers: [1] }, { numbers: [1.2] }]],
  ['missing list', [{ numbers: [1.2] }, {}, { numbers: [1] }]]
])('prefer float when mixed number types in lists - %s', (_, nodeFields) => {
  const nodes = nodeFields.map(fields => ({ fields }))
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(fields, 'Test')

  expect(types.numbers.type.ofType).toEqual(GraphQLFloat)
})

test('infer date fields', () => {
  const fields = createFieldDefinitions([
    {
      fields: {
        date: new Date(),
        date1: '2018',
        date2: '2018-11',
        date3: '2018-11-01',
        date4: '2018-11-01T19:20+01:00',
        date5: '2018-11-01T19:20:30+01:00'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.date.type).toEqual(GraphQLDate)
  expect(types.date1.type).toEqual(GraphQLDate)
  expect(types.date2.type).toEqual(GraphQLDate)
  expect(types.date3.type).toEqual(GraphQLDate)
  expect(types.date4.type).toEqual(GraphQLDate)
  expect(types.date5.type).toEqual(GraphQLDate)
})

test('infer image fields', () => {
  const fields = createFieldDefinitions([
    {
      fields: {
        string: 'image.png',
        image1: '/image.png',
        image2: './image.png',
        url: 'https://www.example.com/images/image.png',
        path: 'dir/to/image.png'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.string.type).toEqual(GraphQLString)
  expect(types.image1.type).toEqual(GraphQLImage)
  expect(types.image2.type).toEqual(GraphQLImage)
  expect(types.url.type).toEqual(GraphQLString)
  expect(types.path.type).toEqual(GraphQLString)
})

test('infer file fields', () => {
  const fields = createFieldDefinitions([
    {
      fields: {
        name: 'document.pdf',
        file1: './document.pdf',
        file2: '/assets/document.pdf',
        file3: 'https://www.example.com/files/document.pdf',
        file4: 'files/document.pdf'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.name.type).toEqual(GraphQLString)
  expect(types.file1.type).toEqual(GraphQLFile)
  expect(types.file2.type).toEqual(GraphQLFile)
  expect(types.file3.type).toEqual(GraphQLString)
  expect(types.file4.type).toEqual(GraphQLString)
})
