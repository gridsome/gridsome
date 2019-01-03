const { isPlainObject } = require('lodash')

function mergeNodeFields (nodes) {
  let fields = {}

  for (let i = 0, l = nodes.length; i < l; i++) {
    fields = fieldValues(nodes[i].fields, fields)
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
    if (isRefField(value[0])) {
      const ref = currentValue || { typeName: [], isList: true }

      for (let i = 0, l = value.length; i < l; i++) {
        if (!ref.typeName.includes(value[i].typeName)) {
          ref.typeName.push(value[i].typeName)
        }
      }

      return ref
    }

    return value.map((value, index) => {
      return fieldValue(value, currentValue ? currentValue[index] : undefined)
    })
  } else if (isPlainObject(value)) {
    if (isRefField(value)) {
      const ref = currentValue || { typeName: value.typeName }
      ref.isList = ref.isList || Array.isArray(value.id)

      return ref
    }

    return fieldValues(value, currentValue)
  }

  return currentValue !== undefined ? currentValue : value
}

function isRefField (field) {
  return (
    typeof field === 'object' &&
    Object.keys(field).length === 2 &&
    field.hasOwnProperty('typeName') &&
    field.hasOwnProperty('id')
  )
}

module.exports = {
  mergeNodeFields
}
