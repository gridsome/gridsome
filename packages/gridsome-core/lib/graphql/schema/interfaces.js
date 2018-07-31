const {
  GraphQLID,
  GraphQLJSON,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('../graphql')

const internalInterface = new GraphQLInterfaceType({
  name: 'InternalInterface',
  fields: () => ({
    type: { type: GraphQLString },
    owner: { type: GraphQLString },
    mediaType: { type: GraphQLString },
    namespace: { type: GraphQLString }
  })
})

const nodeInterface = new GraphQLInterfaceType({
  name: 'NodeInterface',
  fields: () => ({
    _id: {  type: new GraphQLNonNull(GraphQLID) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    internal: { type: new GraphQLNonNull(internalInterface) },
    title: { type: GraphQLString },
    slug: { type: GraphQLString },
    path: { type: GraphQLString },
    status: { type: GraphQLString },
    created: { type: GraphQLString },
    updated: { type: GraphQLString },
    data: { type: GraphQLJSON }
  })
})

module.exports = {
  nodeInterface,
  internalInterface
}
