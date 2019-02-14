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

exports.createTypeName = function (prefix, key) {
  return camelCase(`${prefix} ${key}`, { pascalCase: true })
}
