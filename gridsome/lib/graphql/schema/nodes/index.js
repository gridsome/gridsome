const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')

module.exports = store => {
  const queries = {}
  const connections = {}
  const nodeTypes = {}

  for (const typeName in store.collections) {
    const nodeType = nodeTypes[typeName] = createType({
      contentType: store.getContentType(typeName),
      nodeTypes
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
