const {
  GraphQLString,
  GraphQLBoolean,
  GraphQLError
} = require('../../graphql')

module.exports = nodeType => {
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
    resolve (object, { _id, path, nullable }, { store }) {
      const collection = store.collections[nodeType.name]
      const node = _id ? collection.get(_id) : collection.findOne({ path })

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
