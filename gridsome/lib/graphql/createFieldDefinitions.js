const { omit, isPlainObject, isNumber, isInteger } = require('lodash')
const { isRefField, isRefFieldDefinition } = require('./utils')
const { warn } = require('../utils/log')

module.exports = function createFieldDefinitions (nodes) {
  let fields = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    fields = fieldValues(omit(nodes[i], ['id', 'internal']), fields)
  }

  return fields
}

function fieldValues (obj, currentObj = {}, path = []) {
  const res = { ...currentObj }

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('$')) continue
    if (key.startsWith('__')) continue
    if (value === undefined) continue
    if (value === null) continue

    res[key] = fieldValue(value, currentObj[key], path.concat(key))
  }

  return res
}

function fieldValue (value, currentValue, path = []) {
  if (Array.isArray(value)) {
    const arr = Array.isArray(currentValue) ? currentValue : []
    const length = value.length

    if (isRefField(value[0])) {
      if (!isRefFieldDefinition(currentValue)) {
        currentValue = { typeName: [], isList: true }
      }

      for (let i = 0; i < length; i++) {
        if (!value[i].typeName) {
          warn(`Missing typeName for reference at: ${path.join('.')}.${i}`)
        } else if (!currentValue.typeName.includes(value[i].typeName)) {
          currentValue.typeName.push(value[i].typeName)
        }
      }

      return currentValue
    }

    if (isRefFieldDefinition(currentValue)) {
      return currentValue
    }

    for (let i = 0; i < length; i++) {
      arr[0] = fieldValue(value[i], arr[0], path.concat(i))
    }

    return arr
  } else if (isPlainObject(value)) {
    if (isRefField(value)) {
      if (!value.typeName) {
        warn(`Missing typeName for reference in field: ${path.join('.')}`)
        return currentValue
      }

      const ref = currentValue || { typeName: value.typeName }
      ref.isList = ref.isList || Array.isArray(value.id)

      return ref
    }

    return fieldValues(value, currentValue, path)
  } else if (isNumber(value)) {
    return isNumber(currentValue) && isInteger(value)
      ? currentValue
      : value
  }

  return currentValue !== undefined ? currentValue : value
}
