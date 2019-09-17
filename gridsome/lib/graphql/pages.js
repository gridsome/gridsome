const { createFilterInput } = require('./filters/input')
const { toFilterArgs } = require('./filters/query')
const { trimEnd } = require('lodash')

module.exports = schemaComposer => {
  const typeComposer = schemaComposer.createObjectTC({
    name: 'Page',
    fields: {
      path: 'String!',
      context: 'JSON!'
    }
  })

  const inputTypeComposer = createFilterInput(schemaComposer, typeComposer)

  schemaComposer.Query.addFields({
    page: {
      type: () => typeComposer,
      args: {
        path: 'String!'
      },
      resolve (_, { path }, { pages }) {
        const page = pages.findPage({
          path: trimEnd(path, '/') || '/'
        })

        if (!page) return null

        return {
          path: page.publicPath,
          context: page.context
        }
      }
    },
    allPage: {
      type: () => [typeComposer],
      args: {
        filter: {
          type: inputTypeComposer,
          description: 'Filter pages.'
        }
      },
      resolve (_, { filter }, { pages }) {
        const query = {}

        if (filter) {
          Object.assign(query, toFilterArgs(filter, inputTypeComposer))
        }

        // TODO: return page entries
        return pages.findPages(query).map(page => ({
          path: page.publicPath,
          context: page.context
        }))
      }
    }
  })
}
