const { warn } = require('@vue/cli-shared-utils')
const { unslash } = require('../../../utils')
const baseNodeFields = require('../node-fields')
const { nodeInterface } = require('../interfaces')

const {
  GraphQLInt,
  GraphQLJSON,
  GraphQLList,
  GraphQLString,
  GraphQLNonNull,
  GraphQLObjectType
} = require('../../graphql')

const findOne = (store, _id) => new Promise((resolve, reject) => {
  store.findOne({ _id }, (err, page) => {
    if (err) reject(err)
    else resolve(page)
  })
})

const findSiblings = (store, node) => new Promise((resolve, reject) => {
  store.find({ parent: node.parent }, (err, pages) => {
    if (err) reject(err)
    else resolve(pages)
  })
})

const traverse = async (store, node, results = [node]) => {
  const parent = await findOne(store, node.parent)
  if (!parent) return results
  results.push(parent)
  return traverse(store, parent, results)
}

// const findAvailableRoute = async (input = '/', num = 1) => {
//   const route = input !== '/' ? `${input}-${num}` : `/___conflict-${num}`

//   return new Promise((resolve) => {
//     pages.findOne({ route }, (err, page) => {
//       if (page) findAvailableRoute(route, num += 1)
//       else resolve(route)
//     })
//   })
// }

const pageQuery = new GraphQLObjectType({
  name: 'PageQuery',
  fields: () => ({
    nodeType: { type: GraphQLString },
    query: { type: GraphQLString },
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
      graphql: { type: pageQuery },

      parent: {
        type: pageType,
        resolve (node) {
          return findOne(pages, node.parent)
        }
      },

      layout: {
        type: pageType,
        resolve (node) {
          return findOne(pages, node.layout)
        }
      },

      depth: {
        type: GraphQLInt,
        async resolve (node) {
          const results = await traverse(pages, node)
          return results.length
        }
      },

      path: {
        type: GraphQLString,
        async resolve (node) {
          const results = await traverse(pages, node)
          const siblings = await findSiblings(pages, node)
          const path = results.reverse().map(node => node.slug).join('/')

          if (siblings.filter(n => n.slug === node.slug).length > 1) {
            warn(`Found duplicate path: ${path}`)
          }

          return '/' + unslash(path)
        }
      }
    })
  })

  const queries = {
    page: {
      type: pageType,
      args: {
        _id: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve (_, { _id }) {
        return new Promise((resolve, reject) => {
          pages.findOne({ _id }, (err, page) => {
            if (err) reject(err)
            else resolve(page)
          })
        })
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

        return new Promise((resolve, reject) => {
          pages.find(query, (err, pages) => {
            if (err) reject(err)
            else resolve(pages)
          })
        })
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
