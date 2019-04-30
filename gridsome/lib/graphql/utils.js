const camelCase = require('camelcase')

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

const typeNameCounter = {}

exports.createTypeName = function (prefix, key, suffix = '') {
  let name = camelCase(`${prefix} ${key} ${suffix}`, { pascalCase: true })

  if (typeNameCounter[name]) {
    typeNameCounter[name]++
    name += typeNameCounter[name]
  } else {
    typeNameCounter[name] = 1
  }

  return name
}
