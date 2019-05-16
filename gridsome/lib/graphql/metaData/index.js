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
  const filterFields = createFieldTypes(schemaComposer, fieldDefs, 'MetaData', typeNames)

  const metaDataType = schemaComposer.createObjectTC({
    name: 'MetaData',
    fields: filterFields
  })

  return {
    metaData: {
      resolve: () => fields,
      type: () => metaDataType
    }
  }
}
