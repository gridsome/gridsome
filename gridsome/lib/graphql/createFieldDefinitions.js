const { omit, isPlainObject, isNumber, isInteger } = require('lodash')
const { isRefField, isRefFieldDefinition } = require('./utils')

const exclude = ['$uid', '$loki', 'typeName', 'id', 'internal']

module.exports = function createFieldDefinitions (nodes) {
  let fields = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    fields = fieldValues(omit(nodes[i], exclude), fields)
  }

  return fields
}

function fieldValues (obj, currentObj = {}) {
  const res = { ...currentObj }

  for (const key in obj) {
    const value = obj[key]

    if (key.startsWith('__')) continue
    if (value === undefined) continue
    if (value === null) continue

    res[key] = fieldValue(value, currentObj[key])
  }

  return res
}

function fieldValue (value, currentValue) {
  if (Array.isArray(value)) {
    const arr = Array.isArray(currentValue) ? currentValue : []
    const length = value.length

    if (isRefField(value[0])) {
      if (!isRefFieldDefinition(currentValue)) {
        currentValue = { typeName: [], isList: true }
      }

      for (let i = 0; i < length; i++) {
        if (!currentValue.typeName.includes(value[i].typeName)) {
          currentValue.typeName.push(value[i].typeName)
        }
      }

      return currentValue
    }

    if (isRefFieldDefinition(currentValue)) {
      return currentValue
    }

    for (let i = 0; i < length; i++) {
      arr[0] = fieldValue(value[i], arr[0])
    }

    return arr
  } else if (isPlainObject(value)) {
    if (isRefField(value)) {
      const ref = currentValue || { typeName: value.typeName }
      ref.isList = ref.isList || Array.isArray(value.id)

      return ref
    }

    return fieldValues(value, currentValue)
  } else if (isNumber(value)) {
    return isNumber(currentValue) && isInteger(value)
      ? currentValue
      : value
  }

  return currentValue !== undefined ? currentValue : value
}
