const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const { mergeNodeFields } = require('../../utils/mergeFields')

module.exports = store => {
  const connections = {}
  const nodeTypes = {}
  const queries = {}

  for (const typeName in store.collections) {
    const contentType = store.getContentType(typeName)
    const fields = mergeNodeFields(contentType.collection.find())

    const nodeType = nodeTypes[typeName] = createType({
      contentType,
      nodeTypes,
      fields
    })

    queries[camelCase(typeName)] = createQuery(nodeType)
    connections[`all${typeName}`] = createConnection(nodeType)
  }

  return {
    queries,
    connections,
    nodeTypes
  }
}
