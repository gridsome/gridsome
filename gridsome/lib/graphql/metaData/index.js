const { isEmpty } = require('lodash')
const { createFieldTypes } = require('../createFieldTypes')

module.exports = (schemaComposer, store) => {
  const fields = store.metaData.find().reduce((fields, obj) => {
    fields[obj.key] = obj.data
    return fields
  }, {})

  if (isEmpty(fields)) {
    return {}
  }

  const typeNames = Object.keys(store.collections)
  const metaDataType = schemaComposer.createObjectTC({
    name: 'MetaData',
    fields: () => createFieldTypes(schemaComposer, fields, 'MetaData', typeNames)
  })

  return {
    metaData: {
      resolve: () => fields,
      type: () => metaDataType
    }
  }
}
