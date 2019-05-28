const camelCase = require('camelcase')
const { isObject } = require('lodash')

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
