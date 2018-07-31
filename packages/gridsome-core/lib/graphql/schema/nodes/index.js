const createQuery = require('./query')
const createNodeType = require('./node')
const createConnection = require('./connection')
const createSubscription = require('./subscriptions')
const camelCase = require('camelcase')

const {
  createAddMutation,
  createUpdateMutation,
  createRemoveMutation
} = require('./mutations')

module.exports = sources => {
  const queries = {}
  const mutations = {}
  const connections = {}
  const subscriptions = {}
  const nodeTypes = {}

  for (const { plugin, source } of sources) {
    for (const key in source.types) {
      const contentType = source.types[key]
      const typeName = contentType.type
      const nodeType = nodeTypes[typeName] = createNodeType({ contentType, nodeTypes, source })

      queries[camelCase(typeName)] = createQuery({ nodeType, source })
      connections[`all${typeName}`] = createConnection({ contentType, nodeType, source })

      if (plugin.api.createNode) {
        mutations[`add${typeName}`] = createAddMutation({ plugin, source, nodeType })
        subscriptions[`added${typeName}`] = createSubscription('added', { nodeType })
      }

      if (plugin.api.updateNode) {
        mutations[`update${typeName}`] = createUpdateMutation({ plugin, source, nodeType })
        subscriptions[`updated${typeName}`] = createSubscription('updated', { nodeType })
      }

      if (plugin.api.removeNode) {
        mutations[`remove${typeName}`] = createRemoveMutation({ plugin, source, nodeType })
        subscriptions[`removed${typeName}`] = createSubscription('removed', { nodeType })
      }
    }
  }

  return {
    queries,
    mutations,
    connections,
    subscriptions
  }
}
