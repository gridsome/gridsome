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
      const query = {}

      if (_id) query._id = _id
      if (path) query.path = path

      return new Promise((resolve, reject) => {
        source.nodes.findOne(query, (err, node) => {
          if (err) return reject(err)

          if (!node && !nullable) {
            const message = path
              ? `${path} was not found`
              : `A ${nodeType.name} with id ${_id} was not found`

            return resolve(new GraphQLError(message))
          }

          resolve(node)
        })
      })
    }
  }
}
