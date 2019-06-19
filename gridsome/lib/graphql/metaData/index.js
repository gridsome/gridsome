const { isEmpty } = require('lodash')
const { createFieldTypes } = require('../createFieldTypes')
const createFieldDefinitions = require('../createFieldDefinitions')

module.exports = (schemaComposer, store) => {
  const metaData = store.metaData.find().reduce((fields, obj) => {
    fields[obj.key] = obj.data
    return fields
  }, {})

  if (!schemaComposer.has('MetaData')) {
    schemaComposer.createObjectTC('MetaData')
  }

  const typeCompoer = schemaComposer.get('MetaData')
  const extensions = typeCompoer.getExtensions()

  if (extensions.isUserDefined && !extensions.infer) {
    return addQueryField(schemaComposer, typeCompoer, metaData)
  }

  inferMetaData(schemaComposer, typeCompoer, metaData)
  addQueryField(schemaComposer, typeCompoer, metaData)
}

function inferMetaData (schemaComposer, typeCompoer, metaData) {
  const fieldDefs = createFieldDefinitions([metaData])
  const fieldTypes = createFieldTypes(schemaComposer, fieldDefs, 'MetaData')

  for (const fieldName in fieldTypes) {
    if (!typeCompoer.hasField(fieldName)) {
      typeCompoer.setField(fieldName, fieldTypes[fieldName])
    }
  }
}

function addQueryField (schemaComposer, typeCompoer, metaData) {
  if (isEmpty(typeCompoer.getFields())) {
    return
  }

  schemaComposer.Query.setField('metaData', {
    type: 'MetaData',
    resolve: () => metaData
  })
}
