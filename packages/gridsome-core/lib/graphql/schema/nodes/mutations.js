const {
  pubsub,
  GraphQLJSON,
  GraphQLString,
  GraphQLNonNull
} = require('../../graphql')

const nodeArgs = {
  title: { type: new GraphQLNonNull(GraphQLString) },
  slug: { type: new GraphQLNonNull(GraphQLString) },
  data: { type: GraphQLJSON }
}

function createAddMutation ({ plugin, source, nodeType }) {
  const publishName = `added${nodeType.name}`

  return {
    type: nodeType,
    args: {
      ...nodeArgs,
      type: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve (_, args) {
      args.content = source.stringify(args.data)
      args.created = new Date().toISOString()
      args.updated = new Date().toISOString()

      const node = await plugin.api.createNode(args, source)

      pubsub.publish(publishName, { [publishName]: node })

      return node
    }
  }
}

function createUpdateMutation ({ plugin, source, nodeType }) {
  const publishName = `updated${nodeType.name}`

  return {
    type: nodeType,
    args: {
      ...nodeArgs,
      _id: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve (_, args) {
      args.content = source.stringify(args.data)
      args.updated = new Date().toISOString()

      const node = await plugin.api.updateNode(args, source)

      pubsub.publish(publishName, { [publishName]: node })

      return node
    }
  }
}

function createRemoveMutation ({ plugin, source, nodeType }) {
  const publishName = `removed${nodeType.name}`

  return {
    type: nodeType,
    args: {
      _id: { type: new GraphQLNonNull(GraphQLString) }
    },
    async resolve (_, { _id }) {
      const node = await plugin.api.removeNode(_id, source)

      pubsub.publish(publishName, { [publishName]: node })

      return node
    }
  }
}

module.exports = {
  createAddMutation,
  createUpdateMutation,
  createRemoveMutation
}
