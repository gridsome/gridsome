const { GraphQLString, GraphQLBoolean } = require('graphql')

module.exports = ({ nodeType }) => {
  return {
    type: nodeType,
    args: {
      id: { type: GraphQLString },
      _id: { type: GraphQLString, deprecationReason: 'Use id instead.' },
      path: { type: GraphQLString, deprecationReason: 'Use id instead.' },
      nullable: {
        type: GraphQLBoolean,
        defaultValue: false,
        description: 'Will return an error if not nullable.',
        deprecationReason: 'Will always return null if not found.'
      }
    },
    resolve (object, { _id, id = _id, path }, { store }, { returnType }) {
      const { collection } = store.getContentType(returnType)
      let node = null

      if (id) {
        node = collection.by('id', id)
      } else if (path) {
        // must use collection.findOne() here because
        // collection.by() doesn't update after changes
        node = collection.findOne({ path })
      }

      return node || null
    }
  }
}
