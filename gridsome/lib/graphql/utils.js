const { pick, isObject } = require('lodash')
const camelCase = require('camelcase')

const CreatedGraphQLType = {
  Object: 'Object',
  Union: 'Union',
  Interface: 'Interface',
  InputObject: 'InputObject'
}

exports.CreatedGraphQLType = CreatedGraphQLType

exports.is32BitInt = function (x) {
  return (x | 0) === x
}

exports.isRefField = function (field) {
  return (
    typeof field === 'object' &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('id')
  )
}

exports.isRefFieldDefinition = function (field) {
  return (
    typeof field === 'object' &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('isList')
  )
}

exports.isCreatedType = function (value) {
  return isObject(value) && CreatedGraphQLType.hasOwnProperty(value.type)
}

exports.isObjectType = value => isObject(value) && value.type === CreatedGraphQLType.Object
exports.isUnionType = value => isObject(value) && value.type === CreatedGraphQLType.Union
exports.isInterfaceType = value => isObject(value) && value.type === CreatedGraphQLType.Interface
exports.isInputObjectType = value => isObject(value) && value.type === CreatedGraphQLType.InputObject

const typeNameCounter = {}

exports.createTypeName = function (prefix, key = '', suffix = '') {
  let name = camelCase(`${prefix} ${key} ${suffix}`, { pascalCase: true })

  if (typeNameCounter[name]) {
    typeNameCounter[name]++
    name += typeNameCounter[name]
  } else {
    typeNameCounter[name] = 1
  }

  return name
}

exports.createSchemaAPI = function (extend = {}) {
  const GraphQLJSON = require('graphql-type-json')
  const graphql = require('graphql')

  const res = pick(graphql, [
    // Definitions
    'GraphQLSchema',
    'GraphQLScalarType',
    'GraphQLObjectType',
    'GraphQLInterfaceType',
    'GraphQLUnionType',
    'GraphQLEnumType',
    'GraphQLInputObjectType',
    // Type Wrappers
    'GraphQLList',
    'GraphQLNonNull',
    // Built-in Directives defined by the Spec
    'GraphQLDeprecatedDirective',
    // Standard Scalars
    'GraphQLInt',
    'GraphQLFloat',
    'GraphQLString',
    'GraphQLBoolean',
    'GraphQLID'
  ])

  return {
    ...res,
    ...extend,

    GraphQLJSON,
    graphql,

    // helpers
    createObjectType: options => ({ options, type: CreatedGraphQLType.Object }),
    createUnionType: options => ({ options, type: CreatedGraphQLType.Union }),
    createInterfaceType: options => ({ options, type: CreatedGraphQLType.Interface }),
    createInputObjectType: options => ({ options, type: CreatedGraphQLType.InputObject })
  }
}
