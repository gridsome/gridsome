const { forEach } = require('lodash')
const initMustHaveTypes = require('../../types')
const { createFilterInput } = require('../input')
const { SchemaComposer } = require('graphql-compose')
const { scalarOperators, listOperators } = require('../operators')

test.each(
  ['ID', 'Boolean', 'JSON', 'String', 'Int', 'Float', 'Date']
)('create filter operators for %s scalar type', (typeName) => {
  const typeComposer = createTypeComposer({
    name: 'Post',
    fields: {
      a: typeName,
      b: `${typeName}!`
    }
  })

  forEach(typeComposer.getInputTypeComposer().getFields(), field => {
    expect(Object.keys(field.type.getFields())).toEqual(
      expect.arrayContaining(scalarOperators[typeName])
    )
  })
})

test.each(
  ['ID', 'Boolean', 'JSON', 'String', 'Int', 'Float', 'Date']
)('create filter list operators for %s scalar type', (typeName) => {
  const typeComposer = createTypeComposer({
    name: 'Post',
    fields: {
      a: [typeName]
    }
  })

  forEach(typeComposer.getInputTypeComposer().getFields(), field => {
    expect(Object.keys(field.type.getFields())).toEqual(
      expect.arrayContaining(listOperators)
    )
  })
})

test('create filter operators for node references', () => {
  const schemaComposer = new SchemaComposer()

  schemaComposer.createObjectTC({
    name: 'Tag',
    interfaces: ['Node'],
    fields: {
      id: 'ID!'
    }
  })

  const typeComposer = schemaComposer.createObjectTC({
    name: 'Post',
    interfaces: ['Node'],
    fields: {
      id: 'ID!',
      tag: 'Tag',
      tags: ['Tag']
    }
  })

  const inputTypeComposer = createFilterInput(schemaComposer, typeComposer)
  const inputFields = inputTypeComposer.getFields()

  forEach(inputFields.tag.type.getFields(), (field, fieldName) => {
    const extensions = inputFields.tag.type.getFieldExtensions(fieldName)
    const typeComposer = inputFields.tag.type.getFieldTC(fieldName)

    switch (fieldName) {
      case 'id':
        expect(extensions.isReference).toEqual(true)
        expect(typeComposer.getTypeName()).toEqual('IDQueryOperatorInput')
        break

      default:
        expect(extensions.isInferredReference).toEqual(true)
        expect(typeComposer.getTypeName()).toEqual('ID')
        break
    }
  })
})

function createTypeComposer (config) {
  const schemaComposer = new SchemaComposer()
  const typeComposer = schemaComposer.createObjectTC(config)

  initMustHaveTypes(schemaComposer)
  createFilterInput(schemaComposer, typeComposer)

  return typeComposer
}
