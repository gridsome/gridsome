const {
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('graphql')

const { GraphQLDate } = require('./types/date')

const nodeInterface = new GraphQLInterfaceType({
  name: 'NodeInterface',
  fields: () => ({
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
  nodeInterface
}
