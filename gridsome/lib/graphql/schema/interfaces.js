const {
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('../graphql')

const { GraphQLDate } = require('./types/date')

const internalInterface = new GraphQLInterfaceType({
  name: 'InternalInterface',
  fields: () => ({
    origin: { type: GraphQLString },
    mimeType: { type: GraphQLString },
    content: { type: GraphQLString },
    timestamp: { type: GraphQLInt }
  })
})

const nodeInterface = new GraphQLInterfaceType({
  name: 'NodeInterface',
  fields: () => ({
    internal: { type: new GraphQLNonNull(internalInterface) },
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: GraphQLString },
    slug: { type: GraphQLString },
    path: { type: GraphQLString },
    date: { type: GraphQLDate },
    content: { type: GraphQLString },
    excerpt: { type: GraphQLString }
  })
})

module.exports = {
  nodeInterface,
  internalInterface
}
