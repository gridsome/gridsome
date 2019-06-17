const { isEmpty } = require('lodash')
const { createFieldTypes } = require('../createFieldTypes')
const createFieldDefinitions = require('../createFieldDefinitions')

module.exports = (schemaComposer, store) => {
  const fields = store.metaData.find().reduce((fields, obj) => {
    fields[obj.key] = obj.data
    return fields
  }, {})

  if (isEmpty(fields)) {
    return {}
  }

  const typeNames = Object.keys(store.collections)
  const fieldDefs = createFieldDefinitions([fields])
  const fieldTypes = createFieldTypes(schemaComposer, fieldDefs, 'MetaData', typeNames)

  schemaComposer.createObjectTC({
    name: 'MetaData',
    fields: fieldTypes
  })

  schemaComposer.Query.addFields({
    metaData: {
      type: 'MetaData',
      resolve: () => fields
    }
  })
}
