const camelCase = require('camelcase')
const { isObject } = require('lodash')

const {
  ThunkComposer,
  UnionTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const CreatedGraphQLType = {
  Enum: 'Enum',
  Object: 'Object',
  Union: 'Union',
  Interface: 'Interface',
  Input: 'Input'
}

exports.CreatedGraphQLType = CreatedGraphQLType

exports.is32BitInt = function (x) {
  return (x | 0) === x
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

exports.createEnumType = options => ({ options, type: CreatedGraphQLType.Enum })
exports.createObjectType = options => ({ options, type: CreatedGraphQLType.Object })
exports.createUnionType = options => ({ options, type: CreatedGraphQLType.Union })
exports.createInterfaceType = options => ({ options, type: CreatedGraphQLType.Interface })
exports.createInputType = options => ({ options, type: CreatedGraphQLType.Input })

exports.isEnumType = value => isObject(value) && value.type === CreatedGraphQLType.Enum
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
