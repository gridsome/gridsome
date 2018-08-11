const {
  GraphQLString,
  GraphQLBoolean,
  GraphQLError
} = require('../../graphql')

module.exports = ({ nodeType, source }) => {
  return {
    type: nodeType,
    args: {
      _id: { type: GraphQLString },
      path: { type: GraphQLString },
      nullable: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: 'Will return an error if not nullable.'
      }
    },
    resolve (object, { _id, path, nullable }) {
      const node = _id
        ? source.nodes.get(_id)
        : source.nodes.findOne({ path })

      if (!node && !nullable) {
        const message = path
          ? `${path} was not found`
          : `A ${nodeType.name} with id ${_id} was not found`

        throw new GraphQLError(message)
      }

      return node
    }
  }
}
