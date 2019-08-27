const {
  GraphQLID,
  GraphQLNonNull,
  GraphQLInterfaceType
} = require('graphql')

const nodeInterface = new GraphQLInterfaceType({
  name: 'Node',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) }
  })
})

module.exports = {
  nodeInterface
}
