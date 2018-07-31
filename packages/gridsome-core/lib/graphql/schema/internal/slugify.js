const { GraphQLString, GraphQLNonNull } = require('../../graphql')
const { slugify } = require('../../../utils')

module.exports = () => {
  return {
    queries: {
      slugify: {
        type: GraphQLString,
        args: {
          string: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve (_, { string }) {
          // TODO: check existing slugs
          return '/' + slugify(string)
        }
      }
    }
  }
}
