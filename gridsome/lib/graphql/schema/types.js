const {
  GraphQLInt,
  GraphQLString,
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
    ASC: { value: 1 },
    DESC: { value: -1 }
  }
})

module.exports = {
  pageInfoType,
  sortOrderType
}
