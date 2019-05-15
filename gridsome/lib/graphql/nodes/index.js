const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const createFieldDefinitions = require('../createFieldDefinitions')

module.exports = (schemaComposer, store) => {
  const typeNames = Object.keys(store.collections)
  const schema = {}

  for (const typeName of typeNames) {
    const contentType = store.getContentType(typeName)
    const fields = createFieldDefinitions(contentType.collection.find())
    const args = { schemaComposer, contentType, typeNames, typeName, fields }

    const typeComposer = createType(args)

    schema[camelCase(typeName)] = createQuery({ ...args, typeComposer })
    schema[`all${typeName}`] = createConnection({ ...args, typeComposer })
  }

  return schema
}
