function resolveType (field, graphql) {
  switch (field.type) {
    case 'Array' : return resolveListType(field.items, graphql)
    case 'Number' : return graphql.GraphQLFloat
    case 'Integer' : return graphql.GraphQLInt
    case 'Boolean' : return graphql.GraphQLBoolean
  }

  return graphql.GraphQLString
}

function resolveListType (field, graphql) {
  return new graphql.GraphQLList(resolveType(field, graphql))
}

module.exports = resolveType
