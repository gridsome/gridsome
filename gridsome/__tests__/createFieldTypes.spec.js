const { fileType } = require('../lib/graphql/schema/types/file')
const { imageType } = require('../lib/graphql/schema/types/image')
const { GraphQLDate } = require('../lib/graphql/schema/types/date')
const { mergeNodeFields } = require('../lib/graphql/utils/mergeFields')
const { createFieldTypes } = require('../lib/graphql/schema/createFieldTypes')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType
} = require('../graphql')

test('infer types from node fields', () => {
  const fields = mergeNodeFields([
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
        extendObj: {},
        refs: [],
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
        emptyObj: {},
        emptyString: '',
        refs: [
          { typeName: 'Post', id: '1' } // #128, #129
        ],
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
    }
  ])

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

test('infer date fields', () => {
  const fields = mergeNodeFields([
    {
      fields: {
        date1: '2018',
        date2: '2018-11',
        date3: '2018-11-01',
        date4: '2018-11-01T19:20+01:00',
        date5: '2018-11-01T19:20:30+01:00'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.date1.type).toEqual(GraphQLDate)
  expect(types.date2.type).toEqual(GraphQLDate)
  expect(types.date3.type).toEqual(GraphQLDate)
  expect(types.date4.type).toEqual(GraphQLDate)
  expect(types.date5.type).toEqual(GraphQLDate)
})

test('infer image fields', () => {
  const fields = mergeNodeFields([
    {
      fields: {
        image1: 'image.png',
        image2: '/image.png',
        image3: './image.png',
        image4: 'https://www.example.com/images/image.png',
        image5: 'dir/to/image.png'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.image1.type).toEqual(imageType.type)
  expect(types.image2.type).toEqual(imageType.type)
  expect(types.image3.type).toEqual(imageType.type)
  expect(types.image4.type).toEqual(imageType.type)
  expect(types.image5.type).toEqual(imageType.type)
})

test('infer file fields', () => {
  const fields = mergeNodeFields([
    {
      fields: {
        file1: './document.pdf',
        file2: 'https://www.example.com/files/document.pdf',
        file3: 'files/document.pdf'
      }
    }
  ])

  const types = createFieldTypes(fields, 'TestPost')

  expect(types.file1.type).toEqual(fileType.type)
  expect(types.file2.type).toEqual(fileType.type)
  expect(types.file3.type).toEqual(fileType.type)
})
