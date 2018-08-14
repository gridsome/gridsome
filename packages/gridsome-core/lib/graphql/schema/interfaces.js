const {
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('../graphql')

const internalInterface = new GraphQLInterfaceType({
  name: 'InternalInterface',
  fields: () => ({
    type: { type: GraphQLString },
    owner: { type: GraphQLString }
  })
})

const nodeInterface = new GraphQLInterfaceType({
  name: 'NodeInterface',
  fields: () => ({
    _id: { type: new GraphQLNonNull(GraphQLID) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    internal: { type: new GraphQLNonNull(internalInterface) },
    title: { type: GraphQLString },
    slug: { type: GraphQLString },
    path: { type: GraphQLString },
    content: { type: GraphQLString }
  })
})

module.exports = {
  nodeInterface,
  internalInterface
}
