const { dateType } = require('../types/date')
const GraphQLJSON = require('graphql-type-json')

const {
  GraphQLID,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('graphql')

const pageQuery = new GraphQLObjectType({
  name: 'PageQuery',
  fields: () => ({
    type: { type: GraphQLString },
    content: { type: GraphQLString },
    options: { type: GraphQLJSON }
  })
})

module.exports = () => {
  const pageType = new GraphQLObjectType({
    name: 'Page',
    fields: () => ({
      id: {
        type: new GraphQLNonNull(GraphQLID),
        resolve: node => node.$loki
      },

      type: { type: new GraphQLNonNull(GraphQLString) },
      title: { type: GraphQLString },
      slug: { type: GraphQLString },
      path: { type: GraphQLString },
      component: { type: GraphQLString },
      pageQuery: { type: pageQuery },
      content: { type: GraphQLString },
      date: dateType,

      _id: {
        deprecationReason: 'Use node.id instead.',
        type: new GraphQLNonNull(GraphQLID),
        resolve: node => node.$loki
      }
    })
  })

  const queries = {
    page: {
      type: pageType,
      args: {
        _id: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve (_, { _id }, { store }) {
        return store.pages.find({ _id })
      }
    }
  }

  const connections = {
    allPage: {
      type: new GraphQLList(pageType),
      args: {
        type: {
          type: GraphQLString,
          defaultValue: 'page'
        }
      },
      resolve (_, { type }, { store }) {
        const query = { type }

        if (type === '*') delete query.type

        return store.pages.find(query)
      }
    }
  }

  return {
    queries,
    connections
  }
}
