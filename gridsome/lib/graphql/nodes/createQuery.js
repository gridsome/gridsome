const { GraphQLString, GraphQLBoolean, GraphQLError } = require('graphql')

module.exports = ({ nodeType }) => {
  return {
    type: nodeType,
    args: {
      _id: { type: GraphQLString, deprecationReason: 'Use id instead.' },
      id: { type: GraphQLString },
      path: { type: GraphQLString },
      nullable: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: 'Will return an error if not nullable.'
      }
    },
    resolve (object, { _id, id = _id, path, nullable }, { store }, { returnType }) {
      const { collection } = store.getContentType(returnType)
      let node = null

      if (id) {
        node = collection.by('id', id)
      } else if (path) {
        // must use collection.findOne() here because
        // collection.by() doesn't update after changes
        node = collection.findOne({ path })
      }

      if (!node && !nullable) {
        const message = path
          ? `${path} was not found`
          : `A ${returnType} with id ${id} was not found`

        throw new GraphQLError(message)
      }

      return node
    }
  }
}
