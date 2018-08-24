const {
  GraphQLInt,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLObjectType
} = require('../graphql')

const { internalInterface } = require('./interfaces')

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

const internalType = new GraphQLObjectType({
  name: 'NodeInternal',
  interfaces: [internalInterface],
  fields: () => ({
    origin: { type: GraphQLString },
    mimeType: { type: GraphQLString },
    content: { type: GraphQLString },
    timestamp: { type: GraphQLInt }
  })
})

module.exports = {
  pageInfoType,
  sortOrderType,
  internalType
}
