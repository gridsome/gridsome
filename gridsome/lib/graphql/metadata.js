const { isEmpty } = require('lodash')
const { createFieldTypes } = require('./createFieldTypes')
const createFieldDefinitions = require('./createFieldDefinitions')

module.exports = (schemaComposer, store) => {
  const metadata = store.metadata.find().reduce((fields, obj) => {
    fields[obj.key] = obj.data
    return fields
  }, {})

  if (!schemaComposer.has('Metadata')) {
    schemaComposer.createObjectTC('Metadata')
  }

  const typeCompoer = schemaComposer.get('Metadata')
  const extensions = typeCompoer.getExtensions()

  if (extensions.isCustomType && !extensions.infer) {
    return addQueryField(schemaComposer, typeCompoer, metadata)
  }

  inferMetadata(schemaComposer, typeCompoer, metadata)
  addQueryField(schemaComposer, typeCompoer, metadata)
}

function inferMetadata (schemaComposer, typeCompoer, metadata) {
  const fieldDefs = createFieldDefinitions([metadata])
  const fieldTypes = createFieldTypes(schemaComposer, fieldDefs, 'Metadata')

  for (const fieldName in fieldTypes) {
    if (!typeCompoer.hasField(fieldName)) {
      typeCompoer.setField(fieldName, fieldTypes[fieldName])
    }
  }
}

function addQueryField (schemaComposer, typeCompoer, metadata) {
  if (isEmpty(typeCompoer.getFields())) {
    return
  }

  schemaComposer.Query.setField('metadata', {
    type: 'Metadata',
    resolve: () => metadata
  })

  // TODO: remove before 1.0
  schemaComposer.Query.setField('metaData', {
    type: 'Metadata',
    deprecationReason: 'Use Query.metadata instead.',
    resolve: () => metadata
  })
}
