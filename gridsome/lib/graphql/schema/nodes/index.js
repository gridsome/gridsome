const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const { inferTypes } = require('../infer-types')

module.exports = store => {
  const queries = {}
  const connections = {}
  const nodeTypes = {}

  for (const typeName in store.collections) {
    const contentType = store.getContentType(typeName)
    const nodes = contentType.collection.find()
    const fields = inferTypes(nodes, typeName)
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
    connections
  }
}
