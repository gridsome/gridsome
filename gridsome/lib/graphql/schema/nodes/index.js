const camelCase = require('camelcase')
const createType = require('./createType')
const createQuery = require('./createQuery')
const createConnection = require('./createConnection')
const { inferTypes } = require('../infer-types')

module.exports = store => {
  const queries = {}
  const connections = {}
  const nodeTypes = {}

  for (const typeName in store.types) {
    const collection = store.collections[typeName]
    const nodeType = nodeTypes[typeName] = createType({
      fields: inferTypes(collection.find(), typeName),
      contentType: store.types[typeName],
      nodeTypes
    })

    queries[camelCase(typeName)] = createQuery(nodeType)
    connections[`all${typeName}`] = createConnection(nodeType)
  }

  return {
    queries,
    connections
  }
}
