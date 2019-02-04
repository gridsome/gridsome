const { mapValues } = require('lodash')

const {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLObjectType
} = require('../graphql')

const pageInfoType = new GraphQLObjectType({
  name: 'PageInfo',
  fields: () => ({
    totalPages: { type: new GraphQLNonNull(GraphQLInt) },
    currentPage: { type: new GraphQLNonNull(GraphQLInt) },
    isFirst: { type: new GraphQLNonNull(GraphQLBoolean) },
    isLast: { type: new GraphQLNonNull(GraphQLBoolean) }
  })
})

const sortOrderType = new GraphQLEnumType({
  name: 'SortOrder',
  values: {
    ASC: {
      value: 'ASC',
      name: 'Ascending',
      description: 'Sort ascending'
    },
    DESC: {
      value: 'DESC',
      name: 'Descending',
      description: 'Sort descending'
    }
  }
})

function createTypeNamesEnumType (store) {
  return new GraphQLEnumType({
    name: 'TypeNames',
    values: mapValues(store.collections, (_, typeName) => ({
      value: typeName
    }))
  })
}

module.exports = {
  pageInfoType,
  sortOrderType,
  createTypeNamesEnumType
}
