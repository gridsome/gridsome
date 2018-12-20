const { isEmpty } = require('lodash')
const camelCase = require('camelcase')

const {
  GraphQLInt,
  GraphQLList,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
  GraphQLInputObjectType
} = require('../graphql')

class GraphQLInputFilterObjectType extends GraphQLInputObjectType {}

function createFilterTypes (fields, typeName) {
  const types = {}

  for (const key in fields) {
    const type = createFilterType(fields[key], key, typeName)

    if (type) {
      types[key] = { type }
    }
  }

  return types
}

function createFilterType (value, fieldName, typeName) {
  const type = typeof value

  if (Array.isArray(value)) {
    const valueType = toGraphQLType(value[0])

    return valueType ? new GraphQLInputFilterObjectType({
      name: createFilterName(typeName, fieldName),
      fields: {
        size: { type: GraphQLInt },
        contains: { type: new GraphQLList(valueType) },
        containsAny: { type: new GraphQLList(valueType) },
        containsNone: { type: new GraphQLList(valueType) }
      }
    }) : null
  }

  switch (type) {
    case 'string' :
      return new GraphQLInputFilterObjectType({
        name: createFilterName(typeName, fieldName),
        fields: {
          len: { type: GraphQLInt },
          eq: { type: GraphQLString },
          ne: { type: GraphQLString },
          glob: { type: GraphQLString },
          regex: { type: GraphQLString },
          in: { type: new GraphQLList(GraphQLString) },
          nin: { type: new GraphQLList(GraphQLString) }
        }
      })

    case 'boolean' :
      return new GraphQLInputFilterObjectType({
        name: createFilterName(typeName, fieldName),
        fields: {
          eq: { type: GraphQLBoolean },
          ne: { type: GraphQLBoolean },
          in: { type: new GraphQLList(GraphQLBoolean) },
          nin: { type: new GraphQLList(GraphQLBoolean) }
        }
      })

    case 'number':
      const numberType = toGraphQLType(value)

      return new GraphQLInputFilterObjectType({
        name: createFilterName(typeName, fieldName),
        fields: {
          eq: { type: numberType },
          ne: { type: numberType },
          gt: { type: numberType },
          gte: { type: numberType },
          lt: { type: numberType },
          lte: { type: numberType },
          in: { type: new GraphQLList(numberType) },
          nin: { type: new GraphQLList(numberType) },
          between: { type: new GraphQLList(numberType) }
        }
      })

    case 'object':
      return createObjectFilter(value, fieldName, typeName)
  }
}

function createObjectFilter (obj, fieldName, typeName) {
  const name = createFilterName(typeName, fieldName)
  const fields = {}

  for (const key in obj) {
    const type = createFilterType(obj[key], `${fieldName} ${key}`, typeName)

    if (type) {
      fields[key] = { type }
    }
  }

  return !isEmpty(fields)
    ? new GraphQLInputObjectType({ name, fields })
    : null
}

function createFilterName (typeName, key) {
  return camelCase(`${typeName} ${key} InputFilter`, { pascalCase: true })
}

function toGraphQLType (value) {
  const type = typeof value

  if (Array.isArray(value)) {
    return GraphQLList
  }

  switch (type) {
    case 'string' : return GraphQLString
    case 'boolean' : return GraphQLBoolean
    case 'number' : return is32BitInt(value) ? GraphQLInt : GraphQLFloat
  }
}

function is32BitInt (x) {
  return (x | 0) === x
}

module.exports = {
  createFilterType,
  createFilterTypes,
  GraphQLInputFilterObjectType
}
