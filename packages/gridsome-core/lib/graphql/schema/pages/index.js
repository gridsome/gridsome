const baseNodeFields = require('../node-fields')
const { nodeInterface } = require('../interfaces')

const {
  GraphQLJSON,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

const pageQuery = new GraphQLObjectType({
  name: 'PageQuery',
  fields: () => ({
    type: { type: GraphQLString },
    content: { type: GraphQLString },
    options: { type: GraphQLJSON }
  })
})

module.exports = pages => {
  const pageType = new GraphQLObjectType({
    name: 'Page',
    interfaces: [nodeInterface],
    fields: () => ({
      ...baseNodeFields,
      component: { type: GraphQLString },
      pageQuery: { type: pageQuery }
    })
  })

  const queries = {
    page: {
      type: pageType,
      args: {
        _id: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve (_, { _id }) {
        return pages.find({ _id })
      }
    }
  }

  const mutations = {
    updatePage: {
      type: pageType,
      args: {
        _id: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        slug: { type: new GraphQLNonNull(GraphQLString) },
        parent: { type: new GraphQLNonNull(GraphQLString) },
        layout: { type: new GraphQLNonNull(GraphQLString) },
        data: { type: GraphQLString }
      },
      async resolve (_, args) {
        // args.updated = new Date().toISOString()
        // const page = await plugin.api.updatePage(args, source)
        // pubsub.publish('updatedPage', { updatePage: node })
        // return page
      }
    }
  }

  const subscriptions = {}
  const connections = {
    allPage: {
      type: new GraphQLList(pageType),
      args: {
        type: {
          type: GraphQLString,
          defaultValue: 'page'
        }
      },
      resolve (_, { type }) {
        const query = { type }

        if (type === '*') delete query.type

        return pages.find(query)
      }
    }
  }

  return {
    queries,
    mutations,
    connections,
    subscriptions
  }
}
