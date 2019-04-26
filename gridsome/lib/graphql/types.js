const {
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInputObjectType
} = require('graphql')

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
  name: 'SortOrderEnum',
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

const sortType = new GraphQLInputObjectType({
  name: 'SortArgument',
  fields: () => ({
    by: {
      type: new GraphQLNonNull(GraphQLString),
      defaultValue: 'date'
    },
    order: {
      type: sortOrderType,
      defaultValue: 'DESC'
    }
  })
})

module.exports = {
  pageInfoType,
  sortOrderType,
  sortType
}
