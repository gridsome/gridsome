const createQuery = require('./query')
const createNodeType = require('./node')
const createConnection = require('./connection')
const camelCase = require('camelcase')

module.exports = plugins => {
  const queries = {}
  const mutations = {}
  const connections = {}
  const subscriptions = {}
  const nodeTypes = {}

  for (const plugin of plugins) {
    const source = plugin.instance

    for (const key in source.types) {
      const contentType = source.types[key]
      const typeName = contentType.type
      const options = { contentType, nodeTypes, source }
      const nodeType = nodeTypes[typeName] = createNodeType(options)

      queries[camelCase(typeName)] = createQuery({ nodeType, ...options })
      connections[`all${typeName}`] = createConnection({ nodeType, ...options })
    }
  }

  return {
    queries,
    mutations,
    connections,
    subscriptions
  }
}
