const camelCase = require('camelcase')
const { pickBy, isObject, isPlainObject } = require('lodash')

const {
  ThunkComposer,
  UnionTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const CreatedGraphQLType = {
  Enum: 'Enum',
  Object: 'Object',
  Union: 'Union',
  Scalar: 'Scalar',
  Interface: 'Interface',
  Input: 'Input'
}

exports.createQueryVariables = function (path, variables, currentPage = undefined) {
  return pickBy(
    { ...variables, page: currentPage, __path: path },
    value => value !== undefined
  )
}

exports.is32BitInt = function (x) {
  return (x | 0) === x
}

exports.CreatedGraphQLType = CreatedGraphQLType

exports.isRefFieldDefinition = function (field) {
  return (
    isPlainObject(field) &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('isList')
  )
}

exports.isCreatedType = function (value) {
  return isObject(value) && CreatedGraphQLType.hasOwnProperty(value.type)
}

exports.createEnumType = options => ({ options, type: CreatedGraphQLType.Enum })
exports.createObjectType = options => ({ options, type: CreatedGraphQLType.Object })
exports.createUnionType = options => ({ options, type: CreatedGraphQLType.Union })
exports.createInterfaceType = options => ({ options, type: CreatedGraphQLType.Interface })
exports.createScalarType = options => ({ options, type: CreatedGraphQLType.Scalar })
exports.createInputType = options => ({ options, type: CreatedGraphQLType.Input })

exports.isEnumType = value => isObject(value) && value.type === CreatedGraphQLType.Enum
exports.isObjectType = value => isObject(value) && value.type === CreatedGraphQLType.Object
exports.isUnionType = value => isObject(value) && value.type === CreatedGraphQLType.Union
exports.isInterfaceType = value => isObject(value) && value.type === CreatedGraphQLType.Interface
exports.isScalarType = value => isObject(value) && value.type === CreatedGraphQLType.Scalar
exports.isInputType = value => isObject(value) && value.type === CreatedGraphQLType.Input

const typeNameCounter = {}

exports.createTypeName = function (typeName, suffix = '') {
  suffix = camelCase(suffix, { pascalCase: true })

  let name = suffix ? `${typeName}_${suffix}` : typeName

  if (typeNameCounter[name]) {
    typeNameCounter[name]++
    name += typeNameCounter[name]
  } else {
    typeNameCounter[name] = 1
  }

  return name
}

exports.hasNodeReference = function (typeComposer) {
  switch (typeComposer.constructor) {
    case ObjectTypeComposer:
      return typeComposer.hasInterface('Node')
    case UnionTypeComposer:
      return typeComposer.getTypes().some(type => {
        const typeComposer = type instanceof ThunkComposer
          ? type.getUnwrappedTC()
          : type

        return typeComposer instanceof ObjectTypeComposer
          ? typeComposer.hasInterface('Node')
          : false
      })
    default:
      return false
  }
}
