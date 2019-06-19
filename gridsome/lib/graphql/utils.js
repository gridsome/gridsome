const camelCase = require('camelcase')
const { isObject } = require('lodash')
const { ObjectTypeComposer } = require('graphql-compose')

const CreatedGraphQLType = {
  Object: 'Object',
  Union: 'Union',
  Interface: 'Interface',
  Input: 'Input'
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

exports.createObjectType = options => ({ options, type: CreatedGraphQLType.Object })
exports.createUnionType = options => ({ options, type: CreatedGraphQLType.Union })
exports.createInterfaceType = options => ({ options, type: CreatedGraphQLType.Interface })
exports.createInputType = options => ({ options, type: CreatedGraphQLType.Input })

exports.isObjectType = value => isObject(value) && value.type === CreatedGraphQLType.Object
exports.isUnionType = value => isObject(value) && value.type === CreatedGraphQLType.Union
exports.isInterfaceType = value => isObject(value) && value.type === CreatedGraphQLType.Interface
exports.isInputType = value => isObject(value) && value.type === CreatedGraphQLType.Input

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

exports.addObjectTypeExtensions = function (typeComposer) {
  if (typeComposer instanceof ObjectTypeComposer) {
    typeComposer.getDirectives().forEach(directive => {
      typeComposer.setExtension(directive.name, directive.args)
    })

    Object.keys(typeComposer.getFields()).forEach(fieldName => {
      typeComposer.getFieldDirectives(fieldName).forEach(directive => {
        typeComposer.setFieldExtension(fieldName, directive.name, directive.args)
      })
    })
  }
}
