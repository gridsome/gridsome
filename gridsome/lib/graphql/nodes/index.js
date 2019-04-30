const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const createFieldDefinitions = require('../createFieldDefinitions')

module.exports = store => {
  const connections = {}
  const nodeTypes = {}
  const queries = {}

  for (const typeName in store.collections) {
    const contentType = store.getContentType(typeName)
    const fields = createFieldDefinitions(contentType.collection.find())

    const nodeType = nodeTypes[typeName] = createType({
      contentType,
      nodeTypes,
      fields
    })

    const nodeQuery = createQuery({ contentType, nodeType, fields })
    const nodeConnection = createConnection({ contentType, nodeType, fields })

    queries[camelCase(typeName)] = nodeQuery
    connections[`all${typeName}`] = nodeConnection

    contentType.graphqlType = nodeType
    contentType.graphqlConnection = nodeConnection
  }

  return {
    queries,
    connections,
    nodeTypes
  }
}
