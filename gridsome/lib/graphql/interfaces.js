const {
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('graphql')

const { GraphQLDate } = require('./types/date')

const nodeInterface = new GraphQLInterfaceType({
  name: 'Node',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: GraphQLString },
    path: { type: GraphQLString },
    date: { type: GraphQLDate }
  })
})

module.exports = {
  nodeInterface
}
