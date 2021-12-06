const App = require('../../app/App')
const { createFieldTypes } = require('../createFieldTypes')
const createFieldDefinitions = require('../createFieldDefinitions')

const {
  ListComposer,
  SchemaComposer,
  UnionTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const nodes = [
  {
    '123': 1,
    string: 'bar',
    number: 10,
    zero: 0,
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
      { typeName: 'Post3', id: '1' },
      { typeName: undefined, id: '1' }
    ],
    unionRef: { typeName: 'Post1', id: '1' },
    invalidRef: { typeName: undefined, id: '1' },
    simpleObj: {
      foo: 'bar'
    },
    obj: {
      foo: 'bar',
      empty: [],
      unionRef: { typeName: 'Post1', id: '1' },
      unionRefs: [
        { typeName: 'Post1', id: '1' }
      ]
    }
  },
  {
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
    unionRef: { typeName: 'Post2', id: '1' },
    extendObj: {
      bar: 'foo'
    },
    obj: {
      bar: 'foo',
      unionRef: { typeName: 'Post2', id: '1' },
      unionRefs: [
        { typeName: 'Post2', id: '1' },
        { typeName: 'Post3', id: '1' }
      ],
      test: {
        foo: 'bar',
        emptyObj: {},
        emptyList: []
      }
    },
    deep: {
      list: [],
      object: {}
    }
  },
  {
    ref: null,
    refs: [],
    objList: [],
    invalidList: [null, undefined],
    unionRef: { typeName: 'Post3', id: '1' },
    numberList: [],
    deep: {
      object: {
        empty: {
          object: {},
          list: []
        }
      }
    }
  }
]

test('merge node fields', () => {
  const fields = createFieldDefinitions(nodes)

  expect(fields['123']).toMatchObject({ key: '123', fieldName: '_123', value: 1 })
  expect(fields.emptyString.value).toEqual('')
  expect(fields.zero.value).toEqual(0)
  expect(fields.numberList.value).toHaveLength(1)
  expect(fields.floatList.value).toHaveLength(1)
  expect(fields.objList.value).toHaveLength(1)
  expect(fields.objList.value[0].a.value).toEqual('a')
  expect(fields.objList.value[0].b.value).toEqual('b')
  expect(fields.objList.value[0].c.value).toEqual('c')
  expect(fields.refs.value.typeName).toHaveLength(1)
  expect(fields.refs.value.typeName[0]).toEqual('Post')
  expect(fields.refs.value.isList).toEqual(true)
  expect(fields.refList.value.typeName).toHaveLength(3)
  expect(fields.refList.value.typeName).toEqual(expect.arrayContaining(['Post1', 'Post2', 'Post3']))
  expect(fields.refList.value.isList).toEqual(true)
  expect(fields.ref.value).toMatchObject({ typeName: 'Post', isList: false })
  expect(fields.unionRef.value.isList).toEqual(false)
  expect(fields.unionRef.value.typeName).toHaveLength(3)
  expect(fields.unionRef.value.typeName).toEqual(expect.arrayContaining(['Post1', 'Post2', 'Post3']))
  expect(fields.simpleObj.value.foo.value).toEqual('bar')
  expect(fields.extendObj.value.bar.value).toEqual('foo')
  expect(fields.obj.value.foo.value).toEqual('bar')
  expect(fields.obj.value.bar.value).toEqual('foo')
  expect(fields.obj.value.test.value.foo.value).toEqual('bar')
  expect(fields.obj.value.test.value.emptyObj).toBeUndefined()
  expect(fields.obj.value.test.value.emptyList).toBeUndefined()
  expect(fields.obj.value.unionRef.value.isList).toEqual(false)
  expect(fields.obj.value.unionRef.value.typeName).toHaveLength(2)
  expect(fields.obj.value.unionRef.value.typeName).toEqual(expect.arrayContaining(['Post1', 'Post2']))
  expect(fields.obj.value.unionRefs.value.isList).toEqual(true)
  expect(fields.obj.value.unionRefs.value.typeName).toHaveLength(3)
  expect(fields.obj.value.unionRefs.value.typeName).toEqual(expect.arrayContaining(['Post1', 'Post2', 'Post3']))
  expect(fields.obj.value.empty).toBeUndefined()
  expect(fields.invalidList).toBeUndefined()
  expect(fields.invalidRef).toBeUndefined()
  expect(fields.emptyObj).toBeUndefined()
  expect(fields.emptyList).toBeUndefined()
  expect(fields.deep).toBeUndefined()
})

test('camelcase fieldNames', () => {
  const { field_name, an_object } = createFieldDefinitions([{
    field_name: true,
    an_object: {
      sub_field: true
    }
  }], { camelCase: true })

  expect(field_name.key).toEqual('field_name')
  expect(field_name.fieldName).toEqual('fieldName')
  expect(field_name.directives[0]).toMatchObject({ name: 'proxy', args: { from: 'field_name' } })
  expect(an_object.fieldName).toEqual('anObject')
  expect(an_object.value.sub_field.fieldName).toEqual('subField')
})

test('create graphql types from node fields', async () => {
  const app = await createApp(function (api) {
    api.loadSource(actions => {
      actions.addCollection('Post')
      actions.addCollection('Post1')
      actions.addCollection('Post2')
      actions.addCollection('Post3')
    })
  })

  const schemaComposr = app.schema.getComposer()
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(schemaComposr, fields, 'TestPost')

  expect(types._123.type).toEqual('Int')
  expect(types.string.type).toEqual('String')
  expect(types.number.type).toEqual('Int')
  expect(types.zero.type).toEqual('Int')
  expect(types.float.type).toEqual('Float')
  expect(types.emptyString.type).toEqual('String')
  expect(types.falsyBoolean.type).toEqual('Boolean')
  expect(types.truthyBoolean.type).toEqual('Boolean')
  expect(types.stringList.type).toEqual(['String'])
  expect(types.numberList.type).toEqual(['Int'])
  expect(types.floatList.type).toEqual(['Float'])
  expect(types.booleanList.type).toEqual(['Boolean'])
  expect(types.extendObj.type.getFields().bar.type.getTypeName()).toEqual('String')
  expect(types.simpleObj.type).toBeInstanceOf(ObjectTypeComposer)
  expect(types.obj.type).toBeInstanceOf(ObjectTypeComposer)
  expect(types.obj.type.getTypeName()).toEqual('TestPost_Obj')
  expect(types.obj.type.getField('test').type.getTypeName()).toEqual('TestPost_Obj_Test')
  expect(types.obj.type.getFields().foo.type.getTypeName()).toEqual('String')
  expect(types.obj.type.getFields().bar.type.getTypeName()).toEqual('String')
  expect(types.obj.type.getFields().test.type).toBeInstanceOf(ObjectTypeComposer)
  expect(types.unionRef.type).toBeInstanceOf(UnionTypeComposer)
  expect(types.unionRef.type.getTypes()).toHaveLength(3)
  expect(types.obj.type.getFields().unionRef.type).toBeInstanceOf(UnionTypeComposer)
  expect(types.obj.type.getFields().unionRef.type.getTypes()).toHaveLength(2)
  expect(types.obj.type.getFields().unionRefs.type).toBeInstanceOf(ListComposer)
  expect(types.obj.type.getFields().unionRefs.type.ofType).toBeInstanceOf(UnionTypeComposer)
  expect(types.obj.type.getFields().unionRefs.type.ofType.getTypes()).toHaveLength(3)
  expect(types.invalidList).toBeUndefined()
  expect(types.invalidRef).toBeUndefined()
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
])('prefer float when mixed number types - %s', (_, nodes) => {
  const schemaComposr = new SchemaComposer()
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(schemaComposr, fields, 'Test')

  expect(types.number.type).toEqual('Float')
})

test.each([
  ['number first', [{ numbers: [1, 1.5, 2] }]],
  ['float first', [{ numbers: [1.5, 1] }]],
  ['empty list', [{ numbers: [] }, { numbers: [1] }, { numbers: [1.2] }]],
  ['missing list', [{ numbers: [1.2] }, {}, { numbers: [1] }]]
])('prefer float when mixed number types in lists - %s', (_, nodes) => {
  const schemaComposr = new SchemaComposer()
  const fields = createFieldDefinitions(nodes)
  const types = createFieldTypes(schemaComposr, fields, 'Test')

  expect(types.numbers.type).toEqual(['Float'])
})

test('infer date fields', () => {
  const fields = createFieldDefinitions([
    {
      date: new Date(),
      date1: '2018',
      date2: '2018-11',
      date3: '2018-11-01',
      date4: '2018-11-01T19:20+01:00',
      date5: '2018-11-01T19:20:30+01:00'
    }
  ])

  const schemaComposr = new SchemaComposer()
  const types = createFieldTypes(schemaComposr, fields, 'TestPost')

  expect(types.date.type).toEqual('Date')
  expect(types.date1.type).toEqual('Date')
  expect(types.date2.type).toEqual('Date')
  expect(types.date3.type).toEqual('Date')
  expect(types.date4.type).toEqual('Date')
  expect(types.date5.type).toEqual('Date')
})

test('infer image fields', () => {
  const fields = createFieldDefinitions([
    {
      string: 'image.png',
      image1: '/image.png',
      image2: './image.png',
      image3: './image.JPG',
      url: 'https://www.example.com/images/image.png',
      path: 'dir/to/image.png'
    }
  ])

  const schemaComposr = new SchemaComposer()
  const types = createFieldTypes(schemaComposr, fields, 'TestPost')

  expect(types.string.type).toEqual('String')
  expect(types.image1.type).toEqual('Image')
  expect(types.image2.type).toEqual('Image')
  expect(types.image3.type).toEqual('Image')
  expect(types.url.type).toEqual('String')
  expect(types.path.type).toEqual('String')
})

test('infer file fields', () => {
  const fields = createFieldDefinitions([
    {
      name: 'document.pdf',
      file1: './document.pdf',
      file2: '/assets/document.pdf',
      file3: 'https://www.example.com/files/document.pdf',
      file4: 'files/document.pdf'
    }
  ])

  const schemaComposr = new SchemaComposer()
  const types = createFieldTypes(schemaComposr, fields, 'TestPost')

  expect(types.name.type).toEqual('String')
  expect(types.file1.type).toEqual('File')
  expect(types.file2.type).toEqual('File')
  expect(types.file3.type).toEqual('String')
  expect(types.file4.type).toEqual('String')
})

const { BOOTSTRAP_PAGES } = require('../../utils/constants')

function createApp (plugin, phase = BOOTSTRAP_PAGES) {
  const app = new App(__dirname, {
    localConfig: { plugins: plugin ? [plugin] : [] }
  })

  return app.bootstrap(phase)
}
