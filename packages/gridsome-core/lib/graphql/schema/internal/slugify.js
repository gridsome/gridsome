const { kebabCase } = require('lodash')
const { GraphQLString, GraphQLNonNull } = require('../../graphql')

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
          return kebabCase(string)
        }
      }
    }
  }
}
