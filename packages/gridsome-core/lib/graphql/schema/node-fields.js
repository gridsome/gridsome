const dateFormat = require('dateformat')
const { internalType } = require('./types')

const {
  GraphQLID,
  GraphQLJSON,
  GraphQLString,
  GraphQLNonNull
} = require('../graphql')

module.exports = {
  type: { type: new GraphQLNonNull(GraphQLString) },
  internal: { type: new GraphQLNonNull(internalType) },
  title: { type: GraphQLString },
  slug: { type: GraphQLString },
  path: { type: GraphQLString },
  status: { type: GraphQLString },

  _id: {
    type: new GraphQLNonNull(GraphQLID),
    resolve: node => node.$loki
  },

  data: {
    type: GraphQLJSON,
    resolve (node) {
      return node.data ? JSON.parse(node.data) : null
    }
  },

  created: {
    type: GraphQLString,
    description: 'Created date',
    args: { format: { type: GraphQLString, description: 'Date format' }},
    resolve: (node, { format }) => dateFormat(node.created, format)
  },

  updated: {
    type: GraphQLString,
    description: 'Updated date',
    args: { format: { type: GraphQLString, description: 'Date format' }},
    resolve: (node, { format }) => dateFormat(node.updated, format)
  }
}
