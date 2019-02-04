const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const { mergeNodeFields } = require('../../utils/mergeFields')
const { createTypeNamesEnumType } = require('../types')

module.exports = store => {
  const connections = {}
  const nodeTypes = {}
  const queries = {}

  const typeNameEnum = createTypeNamesEnumType(store)

  for (const typeName in store.collections) {
    const contentType = store.getContentType(typeName)
    const fields = mergeNodeFields(contentType.collection.find())

    const nodeType = nodeTypes[typeName] = createType({
      typeNameEnum,
      contentType,
      nodeTypes,
      fields
    })

    queries[camelCase(typeName)] = createQuery({ nodeType, fields })
    connections[`all${typeName}`] = createConnection({ nodeType, fields })
  }

  return {
    queries,
    connections,
    nodeTypes
  }
}
