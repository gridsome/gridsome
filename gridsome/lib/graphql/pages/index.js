const createFieldDefinitions = require('../createFieldDefinitions')

const {
  createFilterTypes,
  createFilterQuery
} = require('../createFilterTypes')

module.exports = schemaComposer => {
  const pageType = schemaComposer.createObjectTC({
    name: 'Page',
    fields: {
      path: 'String!',
      context: 'JSON'
    }
  })

  const filterFieldDefs = createFieldDefinitions([{ path: '' }])
  const filterType = schemaComposer.createInputTC({
    name: 'PageFilters',
    fields: createFilterTypes(schemaComposer, filterFieldDefs, 'PageFilter')
  })

  const filterFields = filterType.getType().getFields()

  return {
    page: {
      type: () => pageType,
      args: {
        path: 'String!'
      },
      resolve (_, { path }, { pages }) {
        return pages.findPage({ path })
      }
    },
    allPage: {
      type: () => [pageType],
      args: {
        filter: {
          type: filterType,
          description: 'Filter pages.'
        }
      },
      resolve (_, { filter }, { pages }) {
        const query = {}

        if (filter) {
          Object.assign(query, createFilterQuery(filter, filterFields))
        }

        return pages.findPages(query)
      }
    }
  }
}
