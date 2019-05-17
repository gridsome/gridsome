const GraphQLJSON = require('graphql-type-json')

const {
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('graphql')

const {
  createFilterTypes,
  createFilterQuery
} = require('../createFilterTypes')

module.exports = () => {
  const pageType = new GraphQLObjectType({
    name: 'Page',
    fields: () => ({
      path: { type: GraphQLString },
      context: { type: GraphQLJSON }
    })
  })

  const queries = {
    page: {
      type: pageType,
      args: {
        path: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve (_, { path }, { pages }) {
        return pages.findPage({ path })
      }
    }
  }

  const pageConnectionArgs = {
    filter: {
      description: 'Filter for pages.',
      type: new GraphQLInputObjectType({
        name: 'PageFilters',
        fields: createFilterTypes({ path: '' }, 'PageFilter')
      })
    }
  }

  const connections = {
    allPage: {
      type: new GraphQLList(pageType),
      args: pageConnectionArgs,
      resolve (_, { filter }, { pages }) {
        const query = {}

        if (filter) {
          const fields = pageConnectionArgs.filter.type.getFields()
          Object.assign(query, createFilterQuery(filter, fields))
        }

        return pages.findPages(query)
      }
    }
  }

  return {
    queries,
    connections
  }
}
